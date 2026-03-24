use crate::app::services::n2n_service::{preview_edge_command, start_edge, stop_edge};
use crate::app::state::DesktopState;

pub fn command_summary() -> &'static str {
    "desktop command bridge ready"
}

pub fn start_network(state: &mut DesktopState) -> String {
    state.last_command = "start-network".to_string();
    let outcome = start_edge();
    state.last_pid = outcome.pid;
    outcome.detail
}

pub fn stop_network(state: &mut DesktopState) -> String {
    state.last_command = "stop-network".to_string();

    match state.last_pid {
        Some(pid) => {
            let outcome = stop_edge(pid);
            if outcome.ok {
                state.last_pid = None;
            }
            outcome.detail
        }
        None => "no running n2n edge pid recorded".to_string(),
    }
}

pub fn inspect_network() -> String {
    preview_edge_command()
}
