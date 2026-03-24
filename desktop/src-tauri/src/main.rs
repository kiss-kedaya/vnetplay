mod app {
    pub mod commands;
    pub mod services {
        pub mod n2n_service;
    }
    pub mod state;
}
mod game {
    pub mod detector;
}
mod network {
    pub mod edge_manager;
    pub mod node_status;
    pub mod route_probe;
}

use app::commands::{command_summary, inspect_network, start_network};
use app::state::DesktopState;
use game::detector::supported_games;
use network::edge_manager::EdgeManager;
use network::route_probe::current_route;

fn main() {
    let mut state = DesktopState::default();
    println!("vnetplay desktop bootstrap");
    println!("manager: {}", EdgeManager::summary());
    println!("route: {}", current_route());
    println!("games: {:?}", supported_games());
    println!("command bridge: {}", command_summary());
    println!("edge preview: {}", inspect_network());
    println!("start network: {}", start_network(&mut state));
    println!("active room: {}", state.active_room);
    println!("last command: {}", state.last_command);
}
