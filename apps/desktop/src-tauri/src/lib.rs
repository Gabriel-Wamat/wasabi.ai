use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Toggles the main window visibility
fn toggle_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ───────────────────────────────────────────
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            // Derive key from password using Argon2
            let config = argon2::Config {
                mem_cost: 4096,
                time_cost: 3,
                ..Default::default()
            };
            let salt = b"personal-hub-stronghold-salt-v1!";
            let hash = argon2::hash_raw(password.as_ref(), salt, &config)
                .expect("Failed to hash password");
            hash
        }).build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        // ── Setup ─────────────────────────────────────────────
        .setup(|app| {
            // System tray
            let quit  = MenuItem::with_id(app, "quit",      "Sair",            true, None::<&str>)?;
            let show  = MenuItem::with_id(app, "show",      "Mostrar",         true, None::<&str>)?;
            let hide  = MenuItem::with_id(app, "hide",      "Minimizar",       true, None::<&str>)?;
            let sep   = tauri::menu::PredefinedMenuItem::separator(app)?;
            let menu  = Menu::with_items(app, &[&show, &hide, &sep, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Personal Hub")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit"  => app.exit(0),
                    "show"  => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } }
                    "hide"  => { if let Some(w) = app.get_webview_window("main") { let _ = w.hide(); } }
                    _       => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        toggle_window(tray.app_handle())
                    }
                })
                .build(app)?;

            // Global shortcut: Cmd+Shift+H (Mac) / Ctrl+Shift+H (others)
            let shortcut = Shortcut::new(
                Some(Modifiers::SUPER | Modifiers::SHIFT),
                Code::KeyH,
            );
            app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_window(app)
                }
            })?;

            // Close to tray: intercept window close event
            if let Some(win) = app.get_webview_window("main") {
                let window = win.clone();
                win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running Personal Hub");
}
