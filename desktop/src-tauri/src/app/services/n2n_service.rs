use std::process::Command;

pub fn preview_edge_command() -> String {
    let mut command = Command::new("n2n-edge");
    command.arg("-c").arg("vnetplay-room").arg("-l").arg("127.0.0.1:7777");
    format!("{:?}", command)
}
