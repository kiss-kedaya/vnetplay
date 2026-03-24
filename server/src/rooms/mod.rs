#[derive(Clone, Debug)]
pub struct RoomSummary {
    pub room_id: String,
    pub game: String,
    pub members: usize,
}
