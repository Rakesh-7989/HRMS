-- Seed Plans
INSERT INTO plans (name, price, max_employees, features)
VALUES 
(
  'STANDARD', 
  1000.00, 
  50, 
  '{
    "dashboard": {
      "new_joiners": true,
      "birthdays": true,
      "department_members": true,
      "holidays": true,
      "work_anniversaries": true,
      "leave_availabilities": true,
      "upcoming_holidays": true,
      "important_links": true
    },
    "collaboration": {
      "timeline": true,
      "news_feed": true,
      "announcements": true,
      "photo_album": true,
      "external_video_sharing": true,
      "external_article_sharing": true,
      "comments_and_replies": true,
      "reactions": true,
      "news_feeds_moderations": true,
      "tag_employees": true,
      "comments_moderation": true
    },
    "employee_management": {
      "profile": true,
      "self_service": true,
      "directory": true,
      "document_storage": true,
      "inbox": true,
      "single_sign_on": false,
      "portal_access_restriction_date": true,
      "termination": true,
      "filter": true,
      "delete": true
    },
    "leave_tracker": {
      "policies": true,
      "calendar_settings": true,
      "public_holidays": true,
      "restricted_holidays": true,
      "dashboard": true,
      "requests": true,
      "approval_inbox": true,
      "workflow_delegation": true,
      "carry_forward_encashment": true,
      "cancellation": false,
      "balance_customization": true,
      "accrual_reset": true,
      "compensatory_time_off": true,
      "reports": true
    },
    "attendance_tracker": {
      "work_shift_configuration": false,
      "manual_web_checkin": true,
      "automated_web_checkin": false,
      "biometric_checkin": false,
      "dashboard": true,
      "shift_scheduling": false,
      "daily_report": true,
      "team_report": true,
      "team_entry_exit_report": true,
      "enable_manual_requisition": true,
      "manual_requisition_report": true
    },
    "project_management": {
      "timesheet": true,
      "task_board": false,
      "clients": true,
      "task_management": false,
      "invoice_generation": false,
      "reports": true
    },
    "asset_management": {
        "directory": true,
        "barcode_generation": true,
        "tracking": true,
        "usage_history": true,
        "automated_fetch_windows": false,
        "monitoring_windows": false
    },
    "employee_activity_monitoring": {
        "individual_daily_productivity": false,
        "date_range_individual_productivity": false,
        "most_used_apps_websites": false,
        "time_spent_per_application": false,
        "all_applications_web_pages_used": false,
        "realtime_activity": false,
        "daily_team_productivity": false,
        "date_range_team_productivity": false,
        "team_specific_most_used_apps": false,
        "screenshots_capture": false,
        "keystrokes_capture": false,
        "configurable_email_reports": false
    },
    "automation": {
        "attendance_workflow": false,
        "leave_workflow": false,
        "timesheet_workflow": false,
        "expenses_workflow": false
    },
    "performance_management": {
        "flexible_bucket_types": false,
        "configurable_review_cycles": false,
        "short_term_goals_tracking": false,
        "band_specific_questions": false,
        "memos": false,
        "self_manager_assessment": false
    },
    "payroll_automation": {
        "loans": false,
        "cost_centres": false,
        "merchants": false,
        "statutory_options": false,
        "expenses": false,
        "reimbursements": false,
        "income_tax": false,
        "salary_details": false,
        "pay_slips": false,
        "deductions": false,
        "salary_templates": false,
        "consultant_payroll": false,
        "full_final_settlement": false,
        "pay_schedule": false,
        "payrun_draft": false,
        "payrun_approve_reject": false,
        "payrun_revoke": false,
        "payrun_delete": false,
        "salary_revision": false
    },
    "mobile_application": {
        "android": true,
        "ios": true
    },
    "other_features": {
        "robust_custom_role_config": true,
        "privilege_based_access": true,
        "configurable_email_notifications": true,
        "customizable_email_templates": true
    }
  }'
),
(
  'PREMIUM', 
  2000.00, 
  250, 
  '{
    "dashboard": {
      "new_joiners": true,
      "birthdays": true,
      "department_members": true,
      "holidays": true,
      "work_anniversaries": true,
      "leave_availabilities": true,
      "upcoming_holidays": true,
      "important_links": true
    },
    "collaboration": {
      "timeline": true,
      "news_feed": true,
      "announcements": true,
      "photo_album": true,
      "external_video_sharing": true,
      "external_article_sharing": true,
      "comments_and_replies": true,
      "reactions": true,
      "news_feeds_moderations": true,
      "tag_employees": true,
      "comments_moderation": true
    },
    "employee_management": {
      "profile": true,
      "self_service": true,
      "directory": true,
      "document_storage": true,
      "inbox": true,
      "single_sign_on": true,
      "portal_access_restriction_date": true,
      "termination": true,
      "filter": true,
      "delete": true
    },
    "leave_tracker": {
      "policies": true,
      "calendar_settings": true,
      "public_holidays": true,
      "restricted_holidays": true,
      "dashboard": true,
      "requests": true,
      "approval_inbox": true,
      "workflow_delegation": true,
      "carry_forward_encashment": true,
      "cancellation": true,
      "balance_customization": true,
      "accrual_reset": true,
      "compensatory_time_off": true,
      "reports": true
    },
    "attendance_tracker": {
      "work_shift_configuration": true,
      "manual_web_checkin": true,
      "automated_web_checkin": false,
      "biometric_checkin": true,
      "dashboard": true,
      "shift_scheduling": true,
      "daily_report": true,
      "team_report": true,
      "team_entry_exit_report": true,
      "enable_manual_requisition": true,
      "manual_requisition_report": true
    },
    "project_management": {
      "timesheet": true,
      "task_board": true,
      "clients": true,
      "task_management": true,
      "invoice_generation": true,
      "reports": true
    },
    "asset_management": {
        "directory": true,
        "barcode_generation": true,
        "tracking": true,
        "usage_history": true,
        "automated_fetch_windows": false,
        "monitoring_windows": false
    },
    "employee_activity_monitoring": {
        "individual_daily_productivity": false,
        "date_range_individual_productivity": false,
        "most_used_apps_websites": false,
        "time_spent_per_application": false,
        "all_applications_web_pages_used": false,
        "realtime_activity": false,
        "daily_team_productivity": false,
        "date_range_team_productivity": false,
        "team_specific_most_used_apps": false,
        "screenshots_capture": false,
        "keystrokes_capture": false,
        "configurable_email_reports": false
    },
    "automation": {
        "attendance_workflow": true,
        "leave_workflow": true,
        "timesheet_workflow": true,
        "expenses_workflow": true
    },
    "performance_management": {
        "flexible_bucket_types": true,
        "configurable_review_cycles": true,
        "short_term_goals_tracking": true,
        "band_specific_questions": true,
        "memos": true,
        "self_manager_assessment": true
    },
    "payroll_automation": {
        "loans": true,
        "cost_centres": true,
        "merchants": true,
        "statutory_options": true,
        "expenses": true,
        "reimbursements": true,
        "income_tax": true,
        "salary_details": true,
        "pay_slips": true,
        "deductions": true,
        "salary_templates": true,
        "consultant_payroll": true,
        "full_final_settlement": true,
        "pay_schedule": true,
        "payrun_draft": true,
        "payrun_approve_reject": true,
        "payrun_revoke": true,
        "payrun_delete": true,
        "salary_revision": true
    },
    "mobile_application": {
        "android": true,
        "ios": true
    },
    "other_features": {
        "robust_custom_role_config": true,
        "privilege_based_access": true,
        "configurable_email_notifications": true,
        "customizable_email_templates": true
    }
  }'
),
(
  'ELITE', 
  3000.00, 
  500, 
  '{
    "dashboard": {
      "new_joiners": true,
      "birthdays": true,
      "department_members": true,
      "holidays": true,
      "work_anniversaries": true,
      "leave_availabilities": true,
      "upcoming_holidays": true,
      "important_links": true
    },
    "collaboration": {
      "timeline": true,
      "news_feed": true,
      "announcements": true,
      "photo_album": true,
      "external_video_sharing": true,
      "external_article_sharing": true,
      "comments_and_replies": true,
      "reactions": true,
      "news_feeds_moderations": true,
      "tag_employees": true,
      "comments_moderation": true
    },
    "employee_management": {
      "profile": true,
      "self_service": true,
      "directory": true,
      "document_storage": true,
      "inbox": true,
      "single_sign_on": true,
      "portal_access_restriction_date": true,
      "termination": true,
      "filter": true,
      "delete": true
    },
    "leave_tracker": {
      "policies": true,
      "calendar_settings": true,
      "public_holidays": true,
      "restricted_holidays": true,
      "dashboard": true,
      "requests": true,
      "approval_inbox": true,
      "workflow_delegation": true,
      "carry_forward_encashment": true,
      "cancellation": true,
      "balance_customization": true,
      "accrual_reset": true,
      "compensatory_time_off": true,
      "reports": true
    },
    "attendance_tracker": {
      "work_shift_configuration": true,
      "manual_web_checkin": true,
      "automated_web_checkin": true,
      "biometric_checkin": true,
      "dashboard": true,
      "shift_scheduling": true,
      "daily_report": true,
      "team_report": true,
      "team_entry_exit_report": true,
      "enable_manual_requisition": true,
      "manual_requisition_report": true
    },
    "project_management": {
      "timesheet": true,
      "task_board": true,
      "clients": true,
      "task_management": true,
      "invoice_generation": true,
      "reports": true
    },
    "asset_management": {
        "directory": true,
        "barcode_generation": true,
        "tracking": true,
        "usage_history": true,
        "automated_fetch_windows": true,
        "monitoring_windows": true
    },
    "employee_activity_monitoring": {
        "individual_daily_productivity": true,
        "date_range_individual_productivity": true,
        "most_used_apps_websites": true,
        "time_spent_per_application": true,
        "all_applications_web_pages_used": true,
        "realtime_activity": true,
        "daily_team_productivity": true,
        "date_range_team_productivity": true,
        "team_specific_most_used_apps": true,
        "screenshots_capture": true,
        "keystrokes_capture": true,
        "configurable_email_reports": true
    },
    "automation": {
        "attendance_workflow": true,
        "leave_workflow": true,
        "timesheet_workflow": true,
        "expenses_workflow": true
    },
    "performance_management": {
        "flexible_bucket_types": true,
        "configurable_review_cycles": true,
        "short_term_goals_tracking": true,
        "band_specific_questions": true,
        "memos": true,
        "self_manager_assessment": true
    },
    "payroll_automation": {
        "loans": true,
        "cost_centres": true,
        "merchants": true,
        "statutory_options": true,
        "expenses": true,
        "reimbursements": true,
        "income_tax": true,
        "salary_details": true,
        "pay_slips": true,
        "deductions": true,
        "salary_templates": true,
        "consultant_payroll": true,
        "full_final_settlement": true,
        "pay_schedule": true,
        "payrun_draft": true,
        "payrun_approve_reject": true,
        "payrun_revoke": true,
        "payrun_delete": true,
        "salary_revision": true
    },
    "mobile_application": {
        "android": true,
        "ios": true
    },
    "other_features": {
        "robust_custom_role_config": true,
        "privilege_based_access": true,
        "configurable_email_notifications": true,
        "customizable_email_templates": true
    }
  }'
),
(
  'CUSTOM', 
  0.00, 
  NULL, 
  '{
    "dashboard": { "new_joiners": true, "birthdays": true, "department_members": true, "holidays": true, "work_anniversaries": true, "leave_availabilities": true, "upcoming_holidays": true, "important_links": true },
    "collaboration": { "timeline": true, "news_feed": true, "announcements": true, "photo_album": true, "external_video_sharing": true, "external_article_sharing": true, "comments_and_replies": true, "reactions": true, "news_feeds_moderations": true, "tag_employees": true, "comments_moderation": true },
    "employee_management": { "profile": true, "self_service": true, "directory": true, "document_storage": true, "inbox": true, "single_sign_on": true, "portal_access_restriction_date": true, "termination": true, "filter": true, "delete": true },
    "leave_tracker": { "policies": true, "calendar_settings": true, "public_holidays": true, "restricted_holidays": true, "dashboard": true, "requests": true, "approval_inbox": true, "workflow_delegation": true, "carry_forward_encashment": true, "cancellation": true, "balance_customization": true, "accrual_reset": true, "compensatory_time_off": true, "reports": true },
    "attendance_tracker": { "work_shift_configuration": true, "manual_web_checkin": true, "automated_web_checkin": true, "biometric_checkin": true, "dashboard": true, "shift_scheduling": true, "daily_report": true, "team_report": true, "team_entry_exit_report": true, "enable_manual_requisition": true, "manual_requisition_report": true },
    "project_management": { "timesheet": true, "task_board": true, "clients": true, "task_management": true, "invoice_generation": true, "reports": true },
    "asset_management": { "directory": true, "barcode_generation": true, "tracking": true, "usage_history": true, "automated_fetch_windows": true, "monitoring_windows": true },
    "employee_activity_monitoring": { "individual_daily_productivity": true, "date_range_individual_productivity": true, "most_used_apps_websites": true, "time_spent_per_application": true, "all_applications_web_pages_used": true, "realtime_activity": true, "daily_team_productivity": true, "date_range_team_productivity": true, "team_specific_most_used_apps": true, "screenshots_capture": true, "keystrokes_capture": true, "configurable_email_reports": true },
    "automation": { "attendance_workflow": true, "leave_workflow": true, "timesheet_workflow": true, "expenses_workflow": true },
    "performance_management": { "flexible_bucket_types": true, "configurable_review_cycles": true, "short_term_goals_tracking": true, "band_specific_questions": true, "memos": true, "self_manager_assessment": true },
    "payroll_automation": { "loans": true, "cost_centres": true, "merchants": true, "statutory_options": true, "expenses": true, "reimbursements": true, "income_tax": true, "salary_details": true, "pay_slips": true, "deductions": true, "salary_templates": true, "consultant_payroll": true, "full_final_settlement": true, "pay_schedule": true, "payrun_draft": true, "payrun_approve_reject": true, "payrun_revoke": true, "payrun_delete": true, "salary_revision": true },
    "mobile_application": { "android": true, "ios": true },
    "other_features": { "robust_custom_role_config": true, "privilege_based_access": true, "configurable_email_notifications": true, "customizable_email_templates": true },
    "contact_sales": true
  }'
)
ON CONFLICT (name) DO UPDATE SET
  features = EXCLUDED.features,
  price = EXCLUDED.price, 
  max_employees = EXCLUDED.max_employees;
