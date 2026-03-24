use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct CommandResponse {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
}
