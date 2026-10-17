//! Lado nativo da G.W.E.N.
//!
//! Aqui ficam só as coisas que o navegador não pode fazer:
//! abrir pastas no VS Code, no Explorer e no Git Bash.
//! Links (Jira, Confluence, GitHub...) são abertos pelo plugin `opener` no frontend.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager as _;

use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Flag do Windows para não piscar uma janela de console ao chamar `cmd /C code`.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const DEFAULT_GIT_BASH: &str = r"C:\Program Files\Git\git-bash.exe";

/// Verifica se a pasta cadastrada ainda existe na máquina.
#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Abre uma pasta com a ação escolhida no cadastro do projeto.
/// `action`: "vscode" | "explorer" | "gitbash"
#[tauri::command]
fn open_folder(action: String, path: String, git_bash_path: Option<String>) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(format!("Pasta não encontrada: {path}"));
    }

    let result = match action.as_str() {
        "vscode" => open_vscode(&path),
        "explorer" => open_explorer(&path),
        "gitbash" => open_git_bash(&path, git_bash_path),
        other => return Err(format!("Ação desconhecida: {other}")),
    };

    result.map(|_| ()).map_err(|e| e.to_string())
}

/// Situação do repositório Git de uma pasta, para o card do projeto.
#[derive(serde::Serialize, Default)]
struct GitInfo {
    branch: Option<String>,
    /// arquivos alterados ou novos, ainda sem commit
    changes: u32,
    /// commits locais que ainda não foram para o remoto
    ahead: u32,
    /// commits do remoto que ainda não vieram para cá
    behind: u32,
    /// false quando a branch não tem remoto configurado (upstream)
    has_upstream: bool,
    remote_url: Option<String>,
    /// data do último commit, ISO 8601
    last_commit_at: Option<String>,
}

/// Roda um comando git na pasta e devolve a saída, ou None se falhar.
fn git(path: &str, args: &[&str]) -> Option<String> {
    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(path).args(args);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let out = cmd.output().ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Lê branch, alterações, commits sem push e remoto. Devolve None quando a
/// pasta não é um repositório Git (ou o Git não está instalado).
#[tauri::command(async)]
fn git_info(path: String) -> Option<GitInfo> {
    if !Path::new(&path).exists() {
        return None;
    }
    let status = git(&path, &["status", "--porcelain=v2", "--branch"])?;
    let mut info = GitInfo::default();
    for line in status.lines() {
        if let Some(head) = line.strip_prefix("# branch.head ") {
            if head != "(detached)" {
                info.branch = Some(head.to_string());
            }
        } else if line.starts_with("# branch.upstream ") {
            info.has_upstream = true;
        } else if let Some(ab) = line.strip_prefix("# branch.ab ") {
            for part in ab.split_whitespace() {
                if let Some(n) = part.strip_prefix('+') {
                    info.ahead = n.parse().unwrap_or(0);
                } else if let Some(n) = part.strip_prefix('-') {
                    info.behind = n.parse().unwrap_or(0);
                }
            }
        } else if !line.starts_with('#') && !line.is_empty() {
            info.changes += 1;
        }
    }
    info.remote_url = git(&path, &["remote", "get-url", "origin"]).filter(|s| !s.is_empty());
    info.last_commit_at = git(&path, &["log", "-1", "--format=%cI"]).filter(|s| !s.is_empty());
    Some(info)
}

/// Procura o executável do VS Code nas pastas de instalação comuns.
#[cfg(target_os = "windows")]
fn find_vscode_exe() -> Option<std::path::PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        candidates.push(Path::new(&local).join(r"Programs\Microsoft VS Code\Code.exe"));
    }
    for var in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Ok(dir) = std::env::var(var) {
            candidates.push(Path::new(&dir).join(r"Microsoft VS Code\Code.exe"));
        }
    }
    candidates.into_iter().find(|p| p.exists())
}

#[cfg(target_os = "windows")]
fn open_vscode(path: &str) -> std::io::Result<std::process::Child> {
    // Chama o Code.exe direto: assim o caminho chega inteiro, mesmo com espaços.
    if let Some(exe) = find_vscode_exe() {
        return Command::new(exe).arg(path).spawn();
    }
    // Sem o executável nos lugares comuns, usa o `code` do PATH (um .cmd).
    // O caminho vai entre aspas montadas à mão, porque o cmd quebra nos espaços.
    Command::new("cmd")
        .raw_arg(format!("/C code \"{path}\""))
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
}

#[cfg(not(target_os = "windows"))]
fn open_vscode(path: &str) -> std::io::Result<std::process::Child> {
    Command::new("code").arg(path).spawn()
}

#[cfg(target_os = "windows")]
fn open_explorer(path: &str) -> std::io::Result<std::process::Child> {
    Command::new("explorer").arg(path).spawn()
}

#[cfg(target_os = "macos")]
fn open_explorer(path: &str) -> std::io::Result<std::process::Child> {
    Command::new("open").arg(path).spawn()
}

#[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
fn open_explorer(path: &str) -> std::io::Result<std::process::Child> {
    Command::new("xdg-open").arg(path).spawn()
}

#[cfg(target_os = "windows")]
fn open_git_bash(path: &str, custom: Option<String>) -> std::io::Result<std::process::Child> {
    let exe = custom
        .filter(|p| !p.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_GIT_BASH.to_string());
    Command::new(exe).arg(format!("--cd={path}")).spawn()
}

#[cfg(not(target_os = "windows"))]
fn open_git_bash(path: &str, _custom: Option<String>) -> std::io::Result<std::process::Child> {
    // Fora do Windows não existe Git Bash; abre o terminal padrão na pasta
    let _ = DEFAULT_GIT_BASH;
    Command::new("x-terminal-emulator")
        .current_dir(path)
        .spawn()
}

/* ─── DADOS LOCAIS ─── */

/// Nome do banco. O plugin sql resolve `sqlite:gwen.db` dentro da pasta de
/// configuração do app (%APPDATA%\sh.devs-sam.gwen no Windows).
const DB_FILE: &str = "gwen.db";
const BACKUPS_KEPT: usize = 5;

/// Migrações do banco local. Só acrescentam; nunca reescreva uma já publicada (ADR-009).
fn migrations() -> Vec<tauri_plugin_sql::Migration> {
    vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "esquema inicial local",
            sql: include_str!("../migrations/001_local.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "foto do perfil",
            sql: include_str!("../migrations/002_avatar.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "frente da sessao",
            sql: include_str!("../migrations/003_frentes.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}

/// Antes de uma versão nova abrir o banco (e rodar migrações), guarda uma cópia.
/// Roda no setup, antes de o frontend carregar o banco.
fn backup_on_version_change(dir: &Path, version: &str) -> std::io::Result<()> {
    fs::create_dir_all(dir)?;
    let db = dir.join(DB_FILE);
    let marker = dir.join("last_version");
    let last = fs::read_to_string(&marker).unwrap_or_default();
    let last = last.trim();

    if db.exists() && !last.is_empty() && last != version {
        let backups = dir.join("backups");
        fs::create_dir_all(&backups)?;
        let ts = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        fs::copy(&db, backups.join(format!("gwen-{last}-{ts}.db")))?;

        // mantém só as cópias mais recentes
        let mut files: Vec<PathBuf> = fs::read_dir(&backups)?
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().map(|x| x == "db").unwrap_or(false))
            .collect();
        files.sort();
        while files.len() > BACKUPS_KEPT {
            let _ = fs::remove_file(files.remove(0));
        }
    }
    fs::write(&marker, version)
}

/// Caminho da pasta de dados, para o botão "Abrir pasta de dados".
#[tauri::command]
fn data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path().app_config_dir().map(|p| p.display().to_string()).map_err(|e| e.to_string())
}

/// Exportar/importar dados: só arquivos .json escolhidos pelo seletor do sistema.
fn ensure_json(path: &str) -> Result<(), String> {
    if path.to_lowercase().ends_with(".json") {
        Ok(())
    } else {
        Err("Só arquivos .json".into())
    }
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    ensure_json(&path)?;
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    ensure_json(&path)?;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Precisa ser o primeiro plugin. Quando o navegador abre gwen://auth/callback,
    // o Windows tenta iniciar outra cópia do app; este plugin entrega o link para a
    // janela que já está aberta (o evento chega no frontend pelo plugin deep-link).
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:gwen.db", migrations())
                .build(),
        )
        .setup(|_app| {
            if let Ok(dir) = _app.path().app_config_dir() {
                let version = _app.package_info().version.to_string();
                if let Err(e) = backup_on_version_change(&dir, &version) {
                    eprintln!("[gwen] backup do banco falhou: {e}");
                }
            }
            // No Windows e no Linux o esquema gwen:// também é registrado em tempo de
            // execução, então o login com Google funciona até no `yarn app` (modo dev).
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            path_exists,
            open_folder,
            data_dir,
            write_text_file,
            read_text_file,
            git_info
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a G.W.E.N.");
}
