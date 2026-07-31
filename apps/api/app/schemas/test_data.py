from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.sensitive_data import ensure_safe_text

Category = Literal["payment", "api", "user", "webhook", "fixture", "integration"]
Environment = Literal["local", "dev", "staging", "sandbox", "production"]
Sensitivity = Literal["internal", "confidential", "restricted"]
ItemType = Literal["instruction", "vault_reference", "external_link", "fixture"]


class TestDataItemCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=500)
    item_type: ItemType
    display_value: str | None = Field(None, max_length=20_000)
    vault_provider: str | None = Field(None, max_length=100)
    vault_reference: str | None = Field(None, max_length=1000)
    metadata_json: dict = Field(default_factory=dict)
    rotation_due_at: datetime | None = None

    @model_validator(mode="after")
    def enforce_safe_reference(self):
        ensure_safe_text(self.label)
        ensure_safe_text(self.display_value)
        if self.vault_reference and not self.vault_reference.startswith(("vault://", "secret://", "alias://", "https://")):
            raise ValueError("vault_reference must be a vault URI, alias URI, or HTTPS link")
        return self


class TestDataItemResponse(TestDataItemCreate):
    id: UUID
    test_data_set_id: UUID
    created_at: datetime
    updated_at: datetime
    watermark: str | None = None
    model_config = {"from_attributes": True}


class TestDataSetCreate(BaseModel):
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    name: str = Field(..., min_length=1, max_length=500)
    category: Category
    environment: Environment
    sensitivity: Sensitivity = "internal"
    description: str | None = Field(None, max_length=20_000)
    expires_at: datetime | None = None
    last_verified_at: datetime | None = None

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.name)
        ensure_safe_text(self.description)
        return self


class TestDataSetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=500)
    category: Category | None = None
    environment: Environment | None = None
    sensitivity: Sensitivity | None = None
    description: str | None = Field(None, max_length=20_000)
    expires_at: datetime | None = None
    last_verified_at: datetime | None = None

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.name)
        ensure_safe_text(self.description)
        return self


class TestDataSetResponse(BaseModel):
    id: UUID
    workspace_id: UUID | None
    project_id: UUID | None
    name: str
    category: str
    environment: str
    sensitivity: str
    description: str | None
    owner_id: UUID
    expires_at: datetime | None
    last_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[TestDataItemResponse] = Field(default_factory=list)
    model_config = {"from_attributes": True}


class TestDataListResponse(BaseModel):
    data_sets: list[TestDataSetResponse]
    total: int
    page: int
    per_page: int


class ReauthenticationRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)


class ReauthenticationResponse(BaseModel):
    reauth_token: str
    expires_in: int = 300
