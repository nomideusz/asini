"""
Pydantic models for LLM-extracted data.

These define the JSON schema the LLM must return when extracting
pricing, schedule, or about info from crawled markdown.
Used by scrape.py; shapes match what db.py write helpers expect.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ── Pricing ──────────────────────────────────────────────────────────────────


class PricingTier(BaseModel):
    """A single pricing option / package at a studio."""
    name: str = Field(
        ...,
        description="Name of the pricing tier as shown on the page, e.g. "
        "'Karnet Open 30 dni', 'Pakiet 8 wejść', 'Wejście jednorazowe'.",
    )
    price_pln: float = Field(
        ...,
        description="Price in PLN (zł). Must be a positive number.",
    )
    tier_type: str = Field(
        ...,
        description="One of: 'unlimited' (karnet open/monthly), "
        "'pack' (pakiet N wejść), 'single' (jednorazowe), 'trial' (pierwsza wizyta), "
        "'membership' (recurring subscription), 'private' (zajęcia indywidualne), "
        "'intro_pack' (pakiet startowy), 'other'.",
    )
    entries: Optional[int] = Field(
        None,
        description="Number of entries/classes included. Only for pack-type tiers.",
    )
    validity_days: Optional[int] = Field(
        None,
        description="Validity period in days (30=monthly, 90=quarterly). null if not specified.",
    )
    class_types: Optional[list[str]] = Field(
        None,
        description="Which class types this tier applies to, if specific. "
        "E.g. ['joga w hamakach'], ['pilates na reformerze']. null if all classes.",
    )
    notes: Optional[str] = Field(
        None,
        description="Additional info, e.g. 'tylko zajęcia poranne'. In Polish.",
    )


class PricingData(BaseModel):
    """Full pricing extracted from a school's cennik page."""
    tiers: list[PricingTier] = Field(
        default_factory=list,
        description="ALL pricing tiers visible on the page.",
    )
    trial_info: Optional[str] = Field(
        None,
        description="Trial/intro offer description, e.g. 'Pierwsza wizyta gratis'.",
    )
    discounts: Optional[str] = Field(
        None,
        description="Discounts/promotions, e.g. 'Studenci -20%'. null if none.",
    )
    pricing_notes: Optional[str] = Field(
        None,
        description="Important caveats, e.g. 'Ceny od stycznia 2026'. null if none.",
    )
    monthly_pass_pln: Optional[float] = Field(
        None,
        description="Price of the largest unlimited/open monthly pass.",
    )
    trial_price_pln: Optional[float] = Field(
        None,
        description="Trial class price. 0 = free. null = not offered.",
    )
    single_class_pln: Optional[float] = Field(
        None,
        description="Single drop-in class price for the most common class type.",
    )


# ── Schedule ─────────────────────────────────────────────────────────────────


class ScheduleEntry(BaseModel):
    """A single class in the weekly schedule."""
    day: str = Field(..., description="Day of the week in Polish, e.g. 'Poniedziałek'.")
    time: str = Field(..., description="Start–end time, e.g. '07:00-08:30'.")
    class_name: str = Field(..., description="Name of the class, e.g. 'Mysore Ashtanga'.")
    instructor: Optional[str] = Field(None, description="Instructor name if listed.")
    level: Optional[str] = Field(None, description="Level, e.g. 'Początkujący'.")


class ScheduleData(BaseModel):
    """Extracted from a school's schedule/grafik page."""
    classes: list[ScheduleEntry] = Field(
        default_factory=list,
        description="All weekly classes visible on the schedule page.",
    )


# ── About ────────────────────────────────────────────────────────────────────


class AboutData(BaseModel):
    """Extracted from a school's main/about page."""
    styles: list[str] = Field(
        default_factory=list,
        description="Yoga styles offered. Standard names: Ashtanga, Vinyasa, Hatha, Iyengar, "
        "Kundalini, Yin, Yin/Restorative, Aerial, Hot Yoga, Pregnancy, Nidra, Mysore, Power Yoga.",
    )
    description_raw: str = Field(
        "",
        description="The school's own description/about text. Copy verbatim.",
    )
    phone: Optional[str] = Field(None, description="Phone number if found.")
    email: Optional[str] = Field(None, description="Email address if found.")
