from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_active_admin, get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.report import (
    CollectionReportResponse,
    CreditSalesReportResponse,
    CustomerReportResponse,
    DailySalesReportResponse,
    EmployeeActivityReportResponse,
    ReportOverviewResponse,
)
from backend.app.services.customer_service import get_customers_outstanding
from backend.app.services.report_service import (
    export_report_to_excel,
    export_report_to_pdf,
    get_collections_report,
    get_credit_sales_report,
    get_customer_sales_report,
    get_daily_sales_report,
    get_employee_activity_report,
    get_now_addis,
    get_report_overview,
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/overview", response_model=ReportOverviewResponse)
def get_overview_report(
    period: str = Query("today", description="today, yesterday, this_week, last_week, this_month, last_month, custom"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD (for custom period)"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD (for custom period)"),
    employee_id: Optional[UUID] = Query(None, description="Filter by sales creator / payment cashier"),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer account"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOverviewResponse:
    try:
        return get_report_overview(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
            customer_id=customer_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/daily", response_model=DailySalesReportResponse)
def get_daily_report(
    date: Optional[str] = Query(None, description="Report date in YYYY-MM-DD (defaults to today in Addis Ababa)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailySalesReportResponse:
    try:
        return get_daily_sales_report(db=db, report_date_str=date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/weekly", response_model=ReportOverviewResponse)
def get_weekly_report(
    period: str = Query("this_week", description="this_week or last_week"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOverviewResponse:
    if period not in ("this_week", "last_week"):
        period = "this_week"
    return get_report_overview(db=db, period=period)


@router.get("/monthly", response_model=ReportOverviewResponse)
def get_monthly_report(
    period: str = Query("this_month", description="this_month or last_month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOverviewResponse:
    if period not in ("this_month", "last_month"):
        period = "this_month"
    return get_report_overview(db=db, period=period)


@router.get("/custom-range", response_model=ReportOverviewResponse)
def get_custom_range_report(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    employee_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOverviewResponse:
    try:
        return get_report_overview(
            db=db,
            period="custom",
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
            customer_id=customer_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/cash-collections", response_model=CollectionReportResponse)
def get_cash_collections(
    period: str = Query("today"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    employee_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    reference: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CollectionReportResponse:
    try:
        return get_collections_report(
            db=db,
            collection_type="cash",
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
            customer_id=customer_id,
            reference=reference,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/bank-collections", response_model=CollectionReportResponse)
def get_bank_collections(
    period: str = Query("today"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    employee_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    reference: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CollectionReportResponse:
    try:
        return get_collections_report(
            db=db,
            collection_type="bank",
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
            customer_id=customer_id,
            reference=reference,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/credit-sales", response_model=CreditSalesReportResponse)
def get_credit_sales(
    period: str = Query("this_month"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreditSalesReportResponse:
    try:
        return get_credit_sales_report(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            customer_id=customer_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/outstanding-balances")
def get_outstanding_balances_report_view(
    aging_bucket: str = Query("all", description="all, 0_30, 31_60, 61_90, over_90"),
    min_balance: Optional[float] = Query(None),
    max_balance: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns point-in-time outstanding customer balances categorized by Addis Ababa aging brackets.
    """
    return get_customers_outstanding(
        db=db,
        aging_bucket=aging_bucket,
        min_balance=min_balance,
        max_balance=max_balance,
        search=search,
        page=1,
        page_size=1000,
    )


@router.get("/employees", response_model=EmployeeActivityReportResponse)
def get_employees_report(
    period: str = Query("this_month"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    employee_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmployeeActivityReportResponse:
    # Only administrators can view full employee comparison; sales employees can view their own
    if current_user.role != "admin" and employee_id != current_user.id:
        employee_id = current_user.id

    try:
        return get_employee_activity_report(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/customers", response_model=CustomerReportResponse)
def get_customers_report(
    period: str = Query("this_month"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    has_balance: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CustomerReportResponse:
    try:
        return get_customer_sales_report(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            customer_id=customer_id,
            has_balance=has_balance,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==============================================================================
# EXPORT ENDPOINTS (PDF & EXCEL)
# ==============================================================================

@router.get("/export/excel")
def export_excel(
    report_type: str = Query("daily_sales", description="daily_sales, cash_collections, bank_collections, credit_sales, employee_activity, customer_sales"),
    period: str = Query("today"),
    date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    employee_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    reference: Optional[str] = Query(None),
    has_balance: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports the filtered report as a formatted Excel spreadsheet (.xlsx).
    Preserves exact FS Numbers, Sale Numbers, and Paper Receipt Numbers as string values.
    """
    # Fetch report dataset according to requested type and filters
    data, filters_desc = _fetch_report_data_for_export(
        db=db,
        report_type=report_type,
        period=period,
        date_str=date,
        start_date=start_date,
        end_date=end_date,
        employee_id=employee_id,
        customer_id=customer_id,
        reference=reference,
        has_balance=has_balance,
        current_user=current_user,
    )

    excel_bytes = export_report_to_excel(
        report_type=report_type,
        data=data,
        filters_desc=filters_desc,
    )

    filename = f"delgone_{report_type}_{get_now_addis().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf")
def export_pdf(
    report_type: str = Query("daily_sales", description="daily_sales, cash_collections, bank_collections, credit_sales, employee_activity, customer_sales"),
    period: str = Query("today"),
    date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    employee_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    reference: Optional[str] = Query(None),
    has_balance: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports the filtered report as a formatted business PDF document.
    """
    data, filters_desc = _fetch_report_data_for_export(
        db=db,
        report_type=report_type,
        period=period,
        date_str=date,
        start_date=start_date,
        end_date=end_date,
        employee_id=employee_id,
        customer_id=customer_id,
        reference=reference,
        has_balance=has_balance,
        current_user=current_user,
    )

    pdf_bytes = export_report_to_pdf(
        report_type=report_type,
        data=data,
        filters_desc=filters_desc,
    )

    filename = f"delgone_{report_type}_{get_now_addis().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _fetch_report_data_for_export(
    db: Session,
    report_type: str,
    period: str,
    date_str: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    employee_id: Optional[UUID],
    customer_id: Optional[UUID],
    reference: Optional[str],
    has_balance: Optional[bool],
    current_user: User,
) -> tuple[Any, str]:
    filters_desc_parts = [f"Period: {period.replace('_', ' ').title()}"]

    if report_type == "daily_sales":
        if date_str:
            filters_desc_parts.append(f"Date: {date_str}")
        data = get_daily_sales_report(db=db, report_date_str=date_str)

    elif report_type == "cash_collections":
        if reference:
            filters_desc_parts.append(f"Ref: {reference}")
        data = get_collections_report(
            db=db,
            collection_type="cash",
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
            customer_id=customer_id,
            reference=reference,
        )

    elif report_type == "bank_collections":
        if reference:
            filters_desc_parts.append(f"Ref: {reference}")
        data = get_collections_report(
            db=db,
            collection_type="bank",
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
            customer_id=customer_id,
            reference=reference,
        )

    elif report_type == "credit_sales":
        data = get_credit_sales_report(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            customer_id=customer_id,
        )

    elif report_type == "employee_activity":
        if current_user.role != "admin" and employee_id != current_user.id:
            employee_id = current_user.id
        data = get_employee_activity_report(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            employee_id=employee_id,
        )

    elif report_type == "customer_sales":
        if has_balance is not None:
            filters_desc_parts.append("Has Balance: Yes" if has_balance else "Has Balance: No")
        data = get_customer_sales_report(
            db=db,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
            customer_id=customer_id,
            has_balance=has_balance,
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export report type: '{report_type}'",
        )

    return data, " | ".join(filters_desc_parts)
