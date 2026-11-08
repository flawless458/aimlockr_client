#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod menu;

use config::Config;
use std::cell::RefCell;
use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::{Fullscreen, WindowBuilder},
};
use wry::{WebViewBuilder, WebViewBuilderExtWindows};

enum UserEvent {
    SetFullscreen(bool),
}

fn main() -> wry::Result<()> {
    let config = Config::load();

    let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let window = WindowBuilder::new()
        .with_title("aimlockr")
        .with_inner_size(LogicalSize::new(1280.0, 720.0))
        .with_fullscreen(config.fullscreen.then_some(Fullscreen::Borderless(None)))
        .build(&event_loop)
        .expect("failed to create window");

    let shared_config = RefCell::new(config);

    let mut builder = WebViewBuilder::new()
        .with_url("https://kirka.io")
        .with_initialization_script(menu::preload_script(&config))
        .with_ipc_handler(move |request| {
            handle_ipc(request.body(), &shared_config, &proxy);
        });

    let mut args = String::new();
    if !config.gpu_acceleration {
        args.push_str("--disable-gpu ");
    }
    if config.uncap_fps {
        args.push_str("--disable-frame-rate-limit --disable-gpu-vsync --max-gum-fps=9999 ");
    }
    if !args.is_empty() {
        builder = builder.with_additional_browser_args(args.trim_end().to_string());
    }

    let webview = builder.build(&window)?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        let _ = &webview;

        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => *control_flow = ControlFlow::Exit,
            Event::UserEvent(UserEvent::SetFullscreen(on)) => {
                window.set_fullscreen(on.then_some(Fullscreen::Borderless(None)));
            }
            _ => {}
        }
    });
}

fn handle_ipc(
    body: &str,
    config: &RefCell<Config>,
    proxy: &tao::event_loop::EventLoopProxy<UserEvent>,
) {
    #[derive(serde::Deserialize)]
    struct Message {
        key: String,
        value: bool,
    }

    let message: Message = match serde_json::from_str(body) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("[aimlockr] ignoring malformed IPC message {body:?}: {e}");
            return;
        }
    };

    let mut config = config.borrow_mut();
    match message.key.as_str() {
        menu::KEY_FULLSCREEN => {
            config.fullscreen = message.value;
            let _ = proxy.send_event(UserEvent::SetFullscreen(message.value));
        }
        menu::KEY_GPU_ACCELERATION => {
            config.gpu_acceleration = message.value;
        }
        menu::KEY_UNCAP_FPS => {
            config.uncap_fps = message.value;
        }
        other => {
            eprintln!("[aimlockr] ignoring unknown IPC key {other:?}");
            return;
        }
    }
    config.save();
}
