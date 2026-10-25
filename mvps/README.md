# OAA.ai — Project Architecture, Methodology & MVP Screenshots

This directory contains the system diagrams and high-resolution official MVP screenshots for the **OAA.ai (Overall Academic Assessment)** platform.

## Diagrams (Architecture & Methodology)
* **`01_system_architecture_diagram.jpg`**: Multi-tier architecture covering Client Layer (Next.js 14, Tailwind, Radix), Security & Routing (Auth.js with RBAC), Data Ingestion Engine (PDF/Excel), AI & Scoring Engine (OAA weighted formula, Gemini AI risk predictions), and Persistent Data Tier (Turso LibSQL with Drizzle ORM).
* **`02_methodology_workflow_diagram.jpg`**: End-to-end 5-phase data and algorithmic pipeline (Multi-Modal Ingestion $\rightarrow$ Entity Resolution & Cleansing $\rightarrow$ Multi-Dimensional Feature Extraction $\rightarrow$ Composite OAA Scoring $\rightarrow$ Actionable Intelligence & Recalculation).

## Live Application MVP Screenshots
* **`mvp_1_admin_overview.png`**: Executive Admin Dashboard top section with greeting, institutional metrics (Total Students, Average Marks, Attendance Rate, At-Risk Counts), and core OAA performance indicators.
* **`mvp_1b_admin_charts.png`**: Executive Admin Dashboard charts section displaying live Leaderboard Preview, Class Potential Index bar charts, Behavior Alerts Feed, and Chat Moderation Queue.
* **`mvp_2_student_directory.png`**: Student Directory (Grid view) with search, class/section/gender filters, student rank cards, and interactive **Delete Student** action buttons.
* **`mvp_3_student_profile_analytics.png`**: Individual Student 360° Profile view showing 5-axis Radar Skill Chart, monthly Attendance Heatmap calendar, AI Insights, and "Edit Profile" / "Delete Student" action buttons.
* **`mvp_4_data_ingestion.png`**: Intelligent Data Ingestion Portal with drag-and-drop file upload zone, active AI parser status banner, and parsed marks preview.
* **`mvp_5_leaderboard_matrix.png`**: School Leaderboard page showcasing the Top 3 Scholar podium and the complete student ranking table.
* **`mvp_5b_class_potential.png`**: Class Potential Analytics Dashboard plotting departmental growth and performance metrics.
* **`mvp_bonus_student_portal.png`**: Student Portal interface featuring personal OAA score, attendance streak, grade trajectories, and personalized AI focus goals.
