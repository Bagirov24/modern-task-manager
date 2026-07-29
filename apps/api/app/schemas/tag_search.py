"""Tag search / autocomplete schemas (#ux-9).

Решает проблему: пользователь не знает slug тега и не может
руками ввести ?tags=backend в строку поиска.

GET /tags/search?q=bac&scope=all
→ TagSearchResponse с двумя списками:
  - recent: последние 5 тегов которые пользователь использовал
  - matching: теги, название которых содержит q (ilike)

Фронтенд рендерит выпадающий список:

  [ Недавние                     ]
  [ 🗂 #backend  (проекты)  ×14  ]
  [ 🏷 #auth     (задачи)   ×8   ]
  [ ─────────────────────────── ]
  [ Результаты поиска            ]
  [ 🗂 #backlog  (проекты)  ×2   ]

При выборе тег добавляется в активные фильтры без перезагрузки
страницы (optimistic UI).

URL обновляется: /projects?tags=backend,auth

Фронтенд-контракт
-----------------
// В компоненте SearchBar
const { data } = useQuery(
  ['tag-search', q, scope],
  () => api.get(`/tags/search?q=${q}&scope=${scope}`),
  { keepPreviousData: true }
);

<TagDropdown
  recent={data.recent}
  matching={data.matching}
  active={activeTagSlugs}
  onSelect={(slug) => addTagFilter(slug)}
  onDeselect={(slug) => removeTagFilter(slug)}
/>
"""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.unified_tag import TagScope, UnifiedTagResponse


class TagSearchResponse(BaseModel):
    """GET /tags/search response."""

    query: str = Field("", description="Поисковый запрос (для отладки)")
    scope: TagScope = TagScope.PROJECT
    recent: List[UnifiedTagResponse] = Field(
        default_factory=list,
        description="До 5 последних тегов пользователя (из истории фильтрации)",
    )
    matching: List[UnifiedTagResponse] = Field(
        default_factory=list,
        description="Теги, название которых содержит query (ilike, до 20)",
    )
    total_matching: int = Field(
        0,
        description="Всего совпадений (для 'ещё X тегов' в дропдауне)",
    )
