from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.team import Team, TeamMember
from app.models.task import Task
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse

router = APIRouter(tags=["Teams"])

@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(require_role("manager")),
    db: Session = Depends(get_db)
):
    if db.query(Team).filter(Team.name == team_data.name).first():
        raise HTTPException(status_code=400, detail="Team name already exists")

    team = Team(name=team_data.name, description=team_data.description, manager_id=current_user.id)
    db.add(team)
    db.flush()

    db.add(TeamMember(team_id=team.id, user_id=current_user.id, role="manager"))

    for user_id in team_data.member_ids:
        if db.query(User).filter(User.id == user_id).first():
            db.add(TeamMember(team_id=team.id, user_id=user_id, role="member"))

    db.commit()
    db.refresh(team)
    return team

@router.get("/", response_model=List[TeamResponse])
async def get_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = current_user.role.value
    if role == "admin":
        return db.query(Team).all()
    elif role == "manager":
        return db.query(Team).filter(Team.manager_id == current_user.id).all()
    else:
        team_ids = db.query(TeamMember.team_id).filter(TeamMember.user_id == current_user.id)
        return db.query(Team).filter(Team.id.in_(team_ids)).all()

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.manager_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    for field, value in team_data.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    current_user: User = Depends(require_role("manager")),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.manager_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    db.delete(team)
    db.commit()

@router.post("/{team_id}/members/{user_id}")
async def add_team_member(
    team_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.manager_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    existing = db.query(TeamMember).filter(
        and_(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in team")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.add(TeamMember(team_id=team_id, user_id=user_id, role="member"))
    db.commit()
    return {"message": "Member added"}

@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.manager_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    member = db.query(TeamMember).filter(
        and_(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
