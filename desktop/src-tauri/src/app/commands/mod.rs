use chrono::{DateTime, Utc};

use crate::app::services::n2n_service::{
    is_edge_pid_alive, preview_edge_command, start_edge, stop_edge,
};
use crate::app::services::system_identity::{
    current_machine_id, current_machine_label, current_system_username,
};
use crate::app::state::DesktopState;
use crate::ipc::models::{
    CommandResponse, InspectSnapshot, StartNetworkRequest, SystemIdentityResponse,
};

fn now_string() -> String {
    Utc::now().to_rfc3339()
}

fn runtime_duration_from_state(state: &DesktopState, pid_alive: bool) -> (u64, String) {
    if state.last_pid.is_none() || !pid_alive {
        return (0, "idle".to_string());
    }

    let Ok(started_at) = DateTime::parse_from_rfc3339(&state.last_started_at) else {
        return (0, "unknown".to_string());
    };

    let seconds = (Utc::now() - started_at.with_timezone(&Utc))
        .num_seconds()
        .max(0) as u64;
    (seconds, format_duration_label(seconds))
}

fn format_duration_label(seconds: u64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let remaining_seconds = seconds % 60;

    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, remaining_seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, remaining_seconds)
    } else {
        format!("{}s", remaining_seconds)
    }
}

fn cleanup_stale_pid(state: &mut DesktopState) {
    if state.last_pid.is_some() {
        state.heartbeat_generation = state.heartbeat_generation.wrapping_add(1);
        state.last_pid = None;
        state.last_stopped_at = now_string();
        state.last_command = "inspect-auto-cleanup".to_string();
    }
}

pub fn get_system_identity() -> SystemIdentityResponse {
    SystemIdentityResponse {
        system_username: current_system_username(),
        machine_id: current_machine_id(),
        machine_label: current_machine_label(),
    }
}

pub fn start_network(state: &mut DesktopState, payload: StartNetworkRequest) -> CommandResponse {
    state.last_command = "start-network".to_string();
    state.heartbeat_generation = state.heartbeat_generation.wrapping_add(1);

    let mut replaced_detail = None;

    if let Some(existing_pid) = state.last_pid {
        if is_edge_pid_alive(existing_pid) {
            let stop_outcome = stop_edge(existing_pid);

            if !stop_outcome.ok {
                return CommandResponse {
                    ok: false,
                    detail: format!(
                        "failed to replace existing n2n edge pid {} before restart: {}",
                        existing_pid, stop_outcome.detail
                    ),
                    pid: Some(existing_pid),
                    inspect: Some(build_inspect_snapshot(state)),
                };
            }

            state.last_pid = None;
            state.last_stopped_at = now_string();
            replaced_detail = Some(format!("replaced existing n2n edge pid {}", existing_pid));
        } else {
            cleanup_stale_pid(state);
            replaced_detail = Some(format!(
                "cleaned stale n2n edge pid {} before restart",
                existing_pid
            ));
        }
    }

    state.active_room = payload.room_id.clone();
    state.current_username = payload.username.clone();
    state.current_community = payload.community.clone();
    state.current_supernode = payload.supernode.clone();
    state.current_server_base_url = payload.server_base_url.trim().to_string();
    state.current_machine_id = current_machine_id();
    let outcome = start_edge(
        &state.active_room,
        &state.current_username,
        &state.current_community,
        &state.current_supernode,
    );
    state.last_pid = outcome.pid;
    if outcome.ok {
        let now = now_string();
        state.last_started_at = now.clone();
        state.runtime_started_at = now;
    }

    CommandResponse {
        ok: outcome.ok,
        detail: replaced_detail
            .map(|detail| format!("{}; {}", detail, outcome.detail))
            .unwrap_or(outcome.detail),
        pid: outcome.pid,
        inspect: Some(build_inspect_snapshot(state)),
    }
}

pub fn stop_network(state: &mut DesktopState) -> CommandResponse {
    state.last_command = "stop-network".to_string();
    state.heartbeat_generation = state.heartbeat_generation.wrapping_add(1);

    match state.last_pid {
        Some(pid) => {
            let outcome = stop_edge(pid);
            if outcome.ok {
                state.last_pid = None;
                state.last_stopped_at = now_string();
            }

            CommandResponse {
                ok: outcome.ok,
                detail: outcome.detail,
                pid: outcome.pid,
                inspect: Some(build_inspect_snapshot(state)),
            }
        }
        None => CommandResponse {
            ok: true,
            detail: "no running n2n edge pid recorded".to_string(),
            pid: None,
            inspect: Some(build_inspect_snapshot(state)),
        },
    }
}

pub fn inspect_network(state: &mut DesktopState) -> CommandResponse {
    let inspect = build_inspect_snapshot(state);

    if state.last_pid.is_some() && !inspect.pid_alive {
        let stale_pid = inspect.last_pid;
        cleanup_stale_pid(state);
        let cleaned = build_inspect_snapshot(state);

        return CommandResponse {
            ok: true,
            detail: format!(
                "stale pid detected and cleaned up automatically: recorded pid {:?} was not alive",
                stale_pid
            ),
            pid: None,
            inspect: Some(cleaned),
        };
    }

    CommandResponse {
        ok: true,
        detail: preview_edge_command(
            &state.active_room,
            &state.current_username,
            &state.current_community,
            &state.current_supernode,
        ),
        pid: state.last_pid,
        inspect: Some(inspect),
    }
}

fn build_inspect_snapshot(state: &DesktopState) -> InspectSnapshot {
    let pid_alive = state.last_pid.map(is_edge_pid_alive).unwrap_or(false);
    let (runtime_duration_seconds, runtime_duration_label) =
        runtime_duration_from_state(state, pid_alive);

    InspectSnapshot {
        room_id: state.active_room.clone(),
        username: state.current_username.clone(),
        community: state.current_community.clone(),
        supernode: state.current_supernode.clone(),
        command_preview: preview_edge_command(
            &state.active_room,
            &state.current_username,
            &state.current_community,
            &state.current_supernode,
        ),
        edge_state: match (state.last_pid, pid_alive) {
            (Some(_), true) => "running".to_string(),
            (Some(_), false) => "stale-pid".to_string(),
            (None, _) => "idle".to_string(),
        },
        last_command: state.last_command.clone(),
        runtime_started_at: state.runtime_started_at.clone(),
        last_started_at: state.last_started_at.clone(),
        last_stopped_at: state.last_stopped_at.clone(),
        last_pid: state.last_pid,
        pid_alive,
        runtime_duration_seconds,
        runtime_duration_label,
    }
}
