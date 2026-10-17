//! Lado nativo da G.W.E.N.
//!
//! Aqui ficam só as coisas que o navegador não pode fazer:
//! abrir pastas no VS Code, no Explorer e no Git Bash.
//! Links (Jira, Confluence, GitHub...) são abertos pelo plugin `opener` no frontend.

use std::path::Path;

#[cfg(desktop)]
use tauri::Manager;
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

#[cfg(target_os = "windows")]
fn open_vscode(path: &str) -> std::io::Result<std::process::Child> {
    // `code` no Windows é um .cmd, por isso passa pelo cmd
    Command::new("cmd")
        .args(["/C", "code", path])
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
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|_app| {
            // No Windows e no Linux o esquema gwen:// também é registrado em tempo de
            // execução, então o login com Google funciona até no `yarn app` (modo dev).
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![path_exists, open_folder])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a G.W.E.N.");
}
