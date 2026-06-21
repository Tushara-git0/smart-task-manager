from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    member_ids: List[int] = []

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TeamMemberInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    role: str

class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str]
    manager_id: int
    members: List[TeamMemberInfo] = []
