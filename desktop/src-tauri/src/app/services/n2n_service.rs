use std::process::Command;

fn build_edge_command() -> Command {
    let mut command = Command::new("n2n-edge");
    command.arg("-c").arg("vnetplay-room").arg("-l").arg("127.0.0.1:7777");
    command
}

pub fn preview_edge_command() -> String {
    format!("{:?}", build_edge_command())
}

pub fn start_edge() -> String {
    let command = build_edge_command();
    format!("prepared edge command: {:?}", command)
}
