import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import * as XLSX from "xlsx";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can export
    if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || format(new Date(), "yyyy-MM");
    const format_type = searchParams.get("format") || "xlsx";

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, monthNum - 1));
    const endDate = endOfMonth(new Date(year, monthNum - 1));

    // Fetch attendance data
    const attendanceData = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            groups: true,
            phone: true,
          },
        },
        approvedByUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Transform data for export
    const exportData = attendanceData.map((record) => ({
      Date: format(record.date, "dd/MM/yyyy"),
      "Member Name": record.user.name,
      Groups: record.user.groups.length > 0 ? record.user.groups.join(", ") : "N/A",
      Phone: record.user.phone || "N/A",
      Status: record.status,
      "Approval Status": record.approvalStatus,
      "Approved By": record.approvedByUser?.name || "N/A",
      "Marked At": format(record.createdAt, "dd/MM/yyyy HH:mm"),
      Location: record.areaName || "N/A",
    }));

    // Calculate summary statistics
    const summary = {
      "Total Records": exportData.length,
      "Present (P)": exportData.filter(r => r.Status === "P").length,
      "Present with Vardi (PV)": exportData.filter(r => r.Status === "PV").length,
      "Absent (A)": exportData.filter(r => r.Status === "A").length,
      "Approved": exportData.filter(r => r["Approval Status"] === "APPROVED").length,
      "Pending": exportData.filter(r => r["Approval Status"] === "PENDING").length,
      "Rejected": exportData.filter(r => r["Approval Status"] === "REJECTED").length,
    };

    if (format_type === "csv") {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        // Summary section
        ["SUMMARY"],
        ["Metric", "Value"],
        ...Object.entries(summary),
        [],
        // Data section
        ["DETAILED DATA"],
        headers,
        ...exportData.map(row => headers.map(h => {
          const val = (row as any)[h];
          // Escape values with commas or quotes
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })),
      ];

      const csvContent = csvRows.map(row => row.join(",")).join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance_${month}.csv"`,
        },
      });
    } else {
      // Generate Excel
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = Object.entries(summary).map(([metric, value]) => ({
        Metric: metric,
        Value: value,
      }));
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Detailed data sheet
      const dataWs = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, dataWs, "Detailed Data");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance_${month}.xlsx"`,
        },
      });
    }
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Failed to export attendance data" },
      { status: 500 }
    );
  }
}

// Helper function for type safety
function fetchJson<T>(url: string): Promise<{ ok: boolean; data?: T; error?: string }> {
  throw new Error("Function not implemented.");
}
