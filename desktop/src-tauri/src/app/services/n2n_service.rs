use std::process::{Command, Stdio};

#[derive(Clone, Debug)]
pub struct CommandOutcome {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
}

fn build_edge_command(community: &str, supernode: &str) -> Command {
    let mut command = Command::new("n2n-edge");
    command.arg("-c").arg(community).arg("-l").arg(supernode);
    command
}

pub fn preview_edge_command(room_id: &str, username: &str, community: &str, supernode: &str) -> String {
    format!(
        "user={} room={} community={} supernode={} {:?}",
        username,
        room_id,
        community,
        supernode,
        build_edge_command(community, supernode)
    )
}

pub fn start_edge(room_id: &str, username: &str, community: &str, supernode: &str) -> CommandOutcome {
    let mut command = build_edge_command(community, supernode);
    command.stdout(Stdio::null()).stderr(Stdio::null());

    match command.spawn() {
        Ok(child) => CommandOutcome {
            ok: true,
            detail: format!(
                "n2n edge process started for user {} in room {} via community {} -> {}",
                username, room_id, community, supernode
            ),
            pid: Some(child.id()),
        },
        Err(error) => CommandOutcome {
            ok: false,
            detail: format!(
                "failed to start n2n edge for user {} in room {} via community {} -> {}: {}",
                username, room_id, community, supernode, error
            ),
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

pub fn is_edge_pid_alive(pid: u32) -> bool {
    let output = Command::new("tasklist")
        .arg("/FI")
        .arg(format!("PID eq {}", pid))
        .arg("/FO")
        .arg("CSV")
        .arg("/NH")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output();

    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            stdout.contains(&format!(",\"{}\"", pid))
        }
        _ => false,
    }
}
