mod game {
    pub mod detector;
}
mod network {
    pub mod edge_manager;
    pub mod node_status;
    pub mod route_probe;
}

use game::detector::supported_games;
use network::edge_manager::EdgeManager;
use network::route_probe::current_route;

fn main() {
    println!("vnetplay desktop bootstrap");
    println!("manager: {}", EdgeManager::summary());
    println!("route: {}", current_route());
    println!("games: {:?}", supported_games());
}
