#[derive(Clone, Debug)]
pub struct CommandResponse {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
}
