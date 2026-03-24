use std::process::{Command, Stdio};

#[derive(Clone, Debug)]
pub struct CommandOutcome {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
}

fn build_edge_command() -> Command {
    let mut command = Command::new("n2n-edge");
    command.arg("-c").arg("vnetplay-room").arg("-l").arg("127.0.0.1:7777");
    command
}

pub fn preview_edge_command() -> String {
    format!("{:?}", build_edge_command())
}

pub fn start_edge() -> CommandOutcome {
    let mut command = build_edge_command();
    command.stdout(Stdio::null()).stderr(Stdio::null());

    match command.spawn() {
        Ok(child) => CommandOutcome {
            ok: true,
            detail: "n2n edge process started".to_string(),
            pid: Some(child.id()),
        },
        Err(error) => CommandOutcome {
            ok: false,
            detail: format!("failed to start n2n edge: {}", error),
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
