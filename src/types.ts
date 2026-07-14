export interface Recipient {
  unique_id: string;
  recipient_name: string;
  care_of?: string;
  village_or_city: string;
  state: string;
  pincode: string;
  mobile_number: string;
  gps_location: { lat: number; lng: number } | null;
  timestamp: string; // ISO 8601
  note?: string;
}

export interface UserProfile {
  employee_id: string;
  mobile_number: string;
  gmail: string;
  active_session_id?: string; // set on each login; used to detect/force-logout older sessions
  active_session_started_at?: string;
  /** Drive file ID of recipients.json, which holds all of this user's data. */
  recipients_file_id: string;
  drive_folder_id: string;
  created_at: string;
}
