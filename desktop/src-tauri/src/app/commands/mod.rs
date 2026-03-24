use crate::app::services::n2n_service::{preview_edge_command, start_edge};
use crate::app::state::DesktopState;

pub fn command_summary() -> &'static str {
    "desktop command bridge ready"
}

pub fn start_network(state: &mut DesktopState) -> String {
    state.last_command = "start-network".to_string();
    start_edge()
}

pub fn inspect_network() -> String {
    preview_edge_command()
}
