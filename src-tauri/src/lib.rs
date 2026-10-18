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
/// `action`: "vscode" | "explorer" | "gitbash" | "terminal" | "powershell"
#[tauri::command]
fn open_folder(action: String, path: String, git_bash_path: Option<String>) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(format!("Pasta não encontrada: {path}"));
    }

    let result = match action.as_str() {
        "vscode" => open_vscode(&path),
        "explorer" => open_explorer(&path),
        "gitbash" => open_git_bash(&path, git_bash_path),
        "terminal" => open_windows_terminal(&path),
        "powershell" => open_powershell(&path),
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

/// Roda o comando da pasta (ex.: `yarn dev`) num terminal novo, já dentro dela.
/// No Windows é um PowerShell que continua aberto; o caminho vai como pasta de
/// trabalho, então espaços e `&` no caminho não atrapalham.
#[tauri::command]
fn run_command(path: String, command: String, title: Option<String>) -> Result<(), String> {
    if !Path::new(&path).is_dir() {
        return Err(format!("Pasta não encontrada: {path}"));
    }
    let command = command.trim();
    if command.is_empty() {
        return Ok(());
    }
    spawn_terminal(&path, command, title.as_deref().unwrap_or("G.W.E.N.")).map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn spawn_terminal(path: &str, command: &str, title: &str) -> std::io::Result<std::process::Child> {
    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
    let title = title.replace('\'', "''");
    Command::new("powershell")
        .args(["-NoLogo", "-NoExit", "-Command"])
        .arg(format!("$Host.UI.RawUI.WindowTitle = '{title}'; {command}"))
        .current_dir(path)
        .creation_flags(CREATE_NEW_CONSOLE)
        .spawn()
}

#[cfg(target_os = "linux")]
fn spawn_terminal(path: &str, command: &str, _title: &str) -> std::io::Result<std::process::Child> {
    Command::new("x-terminal-emulator")
        .args(["-e", "sh", "-c"])
        .arg(format!("{command}; exec \"${{SHELL:-sh}}\""))
        .current_dir(path)
        .spawn()
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn spawn_terminal(_path: &str, _command: &str, _title: &str) -> std::io::Result<std::process::Child> {
    Err(std::io::Error::new(std::io::ErrorKind::Unsupported, "comandos ainda não funcionam neste sistema"))
}

/// Lê o README da pasta (até 64 KB), para sugerir a descrição do projeto.
#[tauri::command(async)]
fn read_readme(path: String) -> Option<String> {
    const NAMES: [&str; 6] = ["README.md", "readme.md", "Readme.md", "README.MD", "README", "README.txt"];
    let dir = Path::new(&path);
    let file = NAMES.iter().map(|n| dir.join(n)).find(|p| p.is_file())?;
    let bytes = fs::read(file).ok()?;
    let slice = &bytes[..bytes.len().min(64 * 1024)];
    Some(String::from_utf8_lossy(slice).into_owned())
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

/// Windows Terminal na pasta. Sem ele instalado, cai no PowerShell.
#[cfg(target_os = "windows")]
fn open_windows_terminal(path: &str) -> std::io::Result<std::process::Child> {
    match Command::new("wt.exe").args(["-d", path]).spawn() {
        Ok(child) => Ok(child),
        Err(_) => open_powershell(path),
    }
}

#[cfg(not(target_os = "windows"))]
fn open_windows_terminal(path: &str) -> std::io::Result<std::process::Child> {
    Command::new("x-terminal-emulator").current_dir(path).spawn()
}

/// PowerShell numa janela própria, já dentro da pasta.
#[cfg(target_os = "windows")]
fn open_powershell(path: &str) -> std::io::Result<std::process::Child> {
    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
    Command::new("powershell")
        .args(["-NoLogo", "-NoExit"])
        .current_dir(path)
        .creation_flags(CREATE_NEW_CONSOLE)
        .spawn()
}

#[cfg(not(target_os = "windows"))]
fn open_powershell(path: &str) -> std::io::Result<std::process::Child> {
    Command::new("x-terminal-emulator").current_dir(path).spawn()
}

/* ─── LANÇADOR DE APPS (0.8) ─── */

/// Endereço de protocolo (discord://, whatsapp:, spotify:) e não caminho (C:\...)
fn is_protocol(target: &str) -> bool {
    match target.find(':') {
        Some(i) if i > 1 => target[..i].chars().all(|c| c.is_ascii_alphanumeric() || "+.-".contains(c)),
        _ => false,
    }
}

/// Abre um app cadastrado: um executável (com argumentos e pasta opcionais)
/// ou um protocolo como `discord://`. Protocolos vão pelo explorer, que entrega
/// ao app registrado no Windows sem passar pelo cmd (o `&` não quebra nada).
#[tauri::command]
fn launch_app(target: String, args: Option<String>, cwd: Option<String>) -> Result<(), String> {
    let target = target.trim().trim_matches('"').to_string();
    if target.is_empty() {
        return Err("App sem caminho".into());
    }
    if is_protocol(&target) {
        #[cfg(target_os = "windows")]
        let spawned = Command::new("explorer").arg(&target).spawn();
        #[cfg(not(target_os = "windows"))]
        let spawned = Command::new("xdg-open").arg(&target).spawn();
        return spawned.map(|_| ()).map_err(|e| e.to_string());
    }
    let mut cmd = Command::new(&target);
    if let Some(a) = args.filter(|a| !a.trim().is_empty()) {
        cmd.args(split_args(&a));
    }
    if let Some(dir) = cwd.filter(|d| Path::new(d).is_dir()) {
        cmd.current_dir(dir);
    }
    cmd.spawn().map(|_| ()).map_err(|e| format!("Não consegui abrir {target}: {e}"))
}

/// Separa argumentos por espaço, respeitando trechos entre aspas
fn split_args(s: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut quoted = false;
    for c in s.chars() {
        match c {
            '"' => quoted = !quoted,
            ' ' if !quoted => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            _ => cur.push(c),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

/* ─── MAPEAMENTO DE APPS (0.8) ─── */

/// App em primeiro plano. O título da janela não é lido de propósito:
/// só o nome do executável e o caminho, para classificar (trabalho, jogo...).
#[derive(serde::Serialize, Default)]
struct ForegroundApp {
    exe: String,
    path: String,
    /// segundos desde o último toque no teclado ou no mouse
    idle_seconds: u32,
}

#[cfg(target_os = "windows")]
mod activity {
    use super::ForegroundApp;

    pub fn foreground() -> Option<ForegroundApp> {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
        };
        use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return None;
            }
            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 {
                return None;
            }
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle.is_null() {
                return None;
            }
            let mut buf = [0u16; 1024];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len);
            CloseHandle(handle);
            if ok == 0 {
                return None;
            }
            let path = String::from_utf16_lossy(&buf[..len as usize]);
            let exe = path.rsplit(['\\', '/']).next().unwrap_or(&path).to_string();
            Some(ForegroundApp { exe, path, idle_seconds: idle_seconds() })
        }
    }

    pub fn idle_seconds() -> u32 {
        use windows_sys::Win32::System::SystemInformation::GetTickCount;
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
        unsafe {
            let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
            if GetLastInputInfo(&mut info) == 0 {
                return 0;
            }
            GetTickCount().wrapping_sub(info.dwTime) / 1000
        }
    }
}

#[tauri::command]
fn foreground_app() -> Option<ForegroundApp> {
    #[cfg(target_os = "windows")]
    {
        activity::foreground()
    }
    #[cfg(not(target_os = "windows"))]
    {
        None
    }
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
        tauri_plugin_sql::Migration {
            version: 4,
            description: "projetos fixados",
            sql: include_str!("../migrations/004_fixados.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 5,
            description: "lancador e atividade",
            sql: include_str!("../migrations/005_lancador_e_atividade.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 6,
            description: "tarefas",
            sql: include_str!("../migrations/006_tarefas.sql"),
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
/// O frontend só lê e grava backups (.json) e relatórios (.csv), nada além disso.
fn ensure_json(path: &str) -> Result<(), String> {
    let p = path.to_lowercase();
    if p.ends_with(".json") || p.ends_with(".csv") {
        Ok(())
    } else {
        Err("Só arquivos .json ou .csv".into())
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

/* ─── BANDEJA ─────────────────────────────────────────────────────────────
 * Ícone perto do relógio: clique abre a janela; o menu lista projetos para
 * começar direto, sem abrir a janela. O frontend manda a lista e o texto do
 * tooltip (update_tray) e recebe os cliques como eventos "tray://...".
 */
#[cfg(desktop)]
mod tray {
    use std::sync::atomic::{AtomicBool, Ordering};
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    use tauri::{AppHandle, Emitter, Manager, Runtime};

    pub const ID: &str = "gwen";

    /// Fechar a janela esconde na bandeja em vez de sair (configurável)
    pub struct CloseToTray(pub AtomicBool);

    #[derive(serde::Deserialize)]
    pub struct Item {
        /// "id-do-projeto" ou "id-do-projeto::Frente"
        pub key: String,
        pub label: String,
    }

    pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        }
    }

    pub fn build_menu<R: Runtime>(app: &AppHandle<R>, items: &[Item], active: Option<&str>) -> tauri::Result<Menu<R>> {
        let menu = Menu::new(app)?;
        menu.append(&MenuItem::with_id(app, "open", "Abrir G.W.E.N.", true, None::<&str>)?)?;
        menu.append(&PredefinedMenuItem::separator(app)?)?;
        if let Some(label) = active {
            menu.append(&MenuItem::with_id(app, "active", format!("Agora: {label}"), false, None::<&str>)?)?;
            menu.append(&MenuItem::with_id(app, "end", "Encerrar sessão...", true, None::<&str>)?)?;
            menu.append(&PredefinedMenuItem::separator(app)?)?;
        }
        let start = Submenu::with_id(app, "start", "Começar agora", !items.is_empty())?;
        for item in items {
            start.append(&MenuItem::with_id(app, format!("launch:{}", item.key), &item.label, true, None::<&str>)?)?;
        }
        menu.append(&start)?;
        menu.append(&PredefinedMenuItem::separator(app)?)?;
        menu.append(&MenuItem::with_id(app, "quit", "Sair da G.W.E.N.", true, None::<&str>)?)?;
        Ok(menu)
    }

    pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
        let menu = build_menu(app, &[], None)?;
        let mut builder = TrayIconBuilder::with_id(ID)
            .tooltip("G.W.E.N.")
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| {
                let id = event.id().as_ref();
                match id {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    "end" => {
                        // o "onde parei?" precisa da janela
                        show_main(app);
                        let _ = app.emit("tray://end", ());
                    }
                    _ => {
                        if let Some(key) = id.strip_prefix("launch:") {
                            let _ = app.emit("tray://launch", key.to_string());
                        }
                    }
                }
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                    show_main(tray.app_handle());
                }
            });
        if let Some(icon) = app.default_window_icon() {
            builder = builder.icon(icon.clone());
        }
        builder.build(app)?;
        Ok(())
    }

    #[tauri::command]
    pub fn update_tray(app: AppHandle, items: Vec<Item>, active: Option<String>, tooltip: String) -> Result<(), String> {
        let tray = app.tray_by_id(ID).ok_or("bandeja indisponível")?;
        let menu = build_menu(&app, &items, active.as_deref()).map_err(|e| e.to_string())?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
        tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn set_close_to_tray(state: tauri::State<'_, CloseToTray>, on: bool) {
        state.0.store(on, Ordering::Relaxed);
    }

    pub fn should_hide<R: Runtime>(app: &AppHandle<R>) -> bool {
        app.try_state::<CloseToTray>().map(|s| s.0.load(Ordering::Relaxed)).unwrap_or(false)
    }
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
            tray::show_main(app);
        }));
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--autostart"]),
            ));
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
            #[cfg(desktop)]
            {
                _app.manage(tray::CloseToTray(std::sync::atomic::AtomicBool::new(true)));
                tray::create(_app.handle())?;
            }
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
        .on_window_event(|_window, _event| {
            // fechar a janela principal só esconde (a G.W.E.N. segue na bandeja)
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = _event {
                if _window.label() == "main" && tray::should_hide(_window.app_handle()) {
                    api.prevent_close();
                    let _ = _window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            #[cfg(desktop)]
            tray::update_tray,
            #[cfg(desktop)]
            tray::set_close_to_tray,
            path_exists,
            open_folder,
            data_dir,
            write_text_file,
            read_text_file,
            git_info,
            read_readme,
            run_command,
            launch_app,
            foreground_app
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a G.W.E.N.");
}
