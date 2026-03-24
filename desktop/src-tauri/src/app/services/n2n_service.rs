use std::process::{Command, Stdio};

#[derive(Clone, Debug)]
pub struct CommandOutcome {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
}

fn build_edge_command(room_id: &str) -> Command {
    let mut command = Command::new("n2n-edge");
    command.arg("-c").arg(room_id).arg("-l").arg("127.0.0.1:7777");
    command
}

pub fn preview_edge_command(room_id: &str, username: &str) -> String {
    format!("user={} room={} {:?}", username, room_id, build_edge_command(room_id))
}

pub fn start_edge(room_id: &str, username: &str) -> CommandOutcome {
    let mut command = build_edge_command(room_id);
    command.stdout(Stdio::null()).stderr(Stdio::null());

    match command.spawn() {
        Ok(child) => CommandOutcome {
            ok: true,
            detail: format!("n2n edge process started for user {} in room {}", username, room_id),
            pid: Some(child.id()),
        },
        Err(error) => CommandOutcome {
            ok: false,
            detail: format!("failed to start n2n edge for user {} in room {}: {}", username, room_id, error),
            pid: None,
        },
    }
}

pub fn stop_edge(pid: u32) -> CommandOutcome {
    let status = Command::new("taskkill")
        .arg("/PID")
        .arg(pid.to_string())
        .arg("/F")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    match status {
        Ok(exit) if exit.success() => CommandOutcome {
            ok: true,
            detail: format!("stopped n2n edge pid {}", pid),
            pid: Some(pid),
        },
        Ok(exit) => CommandOutcome {
            ok: false,
            detail: format!("taskkill failed for pid {} with code {:?}", pid, exit.code()),
            pid: Some(pid),
        },
        Err(error) => CommandOutcome {
            ok: false,
            detail: format!("failed to stop n2n edge pid {}: {}", pid, error),
            pid: Some(pid),
        },
    }
}
