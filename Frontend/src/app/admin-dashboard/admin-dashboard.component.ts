import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { StudentListComponent } from '../student-list/student-list.component';

interface Student {
  subject_name: string;
  student_name?: string;
  score?: number;  // ✅ updated to match backend field
}

interface SubjectStats {
  subject_name: string;
  average_marks: number;
}

interface StudentData {
  average_marks: SubjectStats[];
  top_students: Student[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  imports: [CommonModule, FormsModule, StudentListComponent, HttpClientModule]
})
export class AdminDashboardComponent {
  activeSection: string = 'student-stats';
  dynamicHeading: string = '🎓 Student Stats';
  dropdownOpen: boolean = false;

  studentData: StudentData = { average_marks: [], top_students: [] };
  users: any[] = [];
  students: any[] = [];
  loginLogs: any[] = [];

  successMessage: string = '';
  errorMessage: string = '';
  showError: boolean = false;
  isDataFetched: boolean = false;
  isLoginLogsFetched: boolean = false;

  selectedMonth: string = '';
  selectedYear: string = '';
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedRole: string = '';

  months = [
    { value: '1', name: 'January' }, { value: '2', name: 'February' }, { value: '3', name: 'March' },
    { value: '4', name: 'April' }, { value: '5', name: 'May' }, { value: '6', name: 'June' },
    { value: '7', name: 'July' }, { value: '8', name: 'August' }, { value: '9', name: 'September' },
    { value: '10', name: 'October' }, { value: '11', name: 'November' }, { value: '12', name: 'December' }
  ];
  years = ['2023', '2024', '2025', '2026'];
  roles = ['Admin', 'Teacher', 'Student'];

  newUser = { name: '', role: '', username: '', password: '' };

  constructor(private http: HttpClient) {
    this.fetchUsers();
    this.fetchStudents();
  }

  showDropdown() {
    this.dropdownOpen = true;
  }

  hideDropdown() {
    setTimeout(() => {
      this.dropdownOpen = false;
    }, 300);
  }

  setActiveSection(section: string) {
    this.activeSection = section;
    this.dropdownOpen = false;

    const sectionHeadings: { [key: string]: string } = {
      'student-stats': '🎓 Student Stats',
      'login-logs': '📊 Login Logs',
      'user-management': '👤 User Management',
      'add-user': '➕ Add New User',
      'delete-user': '❌ Delete User',
      'student-list': '📋 Student List'
    };

    this.dynamicHeading = sectionHeadings[section] || 'Admin Dashboard';
  }

  fetchStudentData() {
    if (!this.selectedMonth || !this.selectedYear) {
      this.showError = true;
      this.errorMessage = '⚠️ Please select both Month and Year before fetching data.';
      this.studentData = { average_marks: [], top_students: [] };
      return;
    }

    const authToken = localStorage.getItem('authToken');
    const apiUrl = `http://localhost:5000/dashboard/stats?month=${this.selectedMonth}&year=${this.selectedYear}`;

    this.http.get<StudentData>(apiUrl, {
      headers: { Authorization: `Bearer ${authToken}` }
    }).subscribe({
      next: (response) => {
        console.log("Fetched Student Data:", response);
        this.studentData = response || { average_marks: [], top_students: [] };
        this.isDataFetched = true;
        this.showError = false;
      },
      error: () => {
        this.errorMessage = '❌ Failed to load student details.';
        this.showError = true;
      }
    });
  }

  fetchLoginLogs() {
    if (!this.selectedRole || !this.selectedStartDate || !this.selectedEndDate) {
      this.showError = true;
      this.errorMessage = '⚠️ Please select Role, Start Date, and End Date to fetch logs.';
      this.loginLogs = [];
      return;
    }

    const authToken = localStorage.getItem('authToken');
    const apiUrl = `http://localhost:5000/dashboard/login-logs?role=${this.selectedRole}&start_date=${this.selectedStartDate}&end_date=${this.selectedEndDate}`;

    this.http.get<{ login_logs: any[] }>(apiUrl, { headers: { Authorization: `Bearer ${authToken}` } })
      .subscribe({
        next: (response) => {
          this.loginLogs = response?.login_logs || [];
          this.isLoginLogsFetched = true;
          this.showError = false;
        },
        error: () => {
          this.errorMessage = '❌ Failed to fetch login logs.';
          this.showError = true;
        }
      });
  }

  fetchUsers() {
    const authToken = localStorage.getItem('authToken');
    this.http.get<any[]>('http://localhost:5000/users', { headers: { Authorization: `Bearer ${authToken}` } })
      .subscribe({
        next: (response) => {
          this.users = response || [];
        },
        error: () => {
          this.errorMessage = '❌ Error fetching users.';
        }
      });
  }

  fetchStudents() {
    const authToken = localStorage.getItem('authToken');
    this.http.get<any[]>('http://localhost:5000/students', { headers: { Authorization: `Bearer ${authToken}` } })
      .subscribe({
        next: (response) => {
          this.students = response || [];
        },
        error: () => {
          this.errorMessage = '❌ Failed to fetch students.';
        }
      });
  }

  getTopStudentName(subjectName: string): string {
    const student = this.studentData.top_students.find(s => s.subject_name === subjectName);
    return student ? student.student_name || 'N/A' : 'N/A';
  }

  getTopStudentMarks(subjectName: string): number | string {
    const student = this.studentData.top_students.find(s => s.subject_name === subjectName);
    return student ? student.score ?? 'N/A' : 'N/A'; // ✅ changed from .marks to .score
  }

  addUser() {
    if (!this.newUser.name || !this.newUser.role || !this.newUser.username || !this.newUser.password) {
      this.errorMessage = '⚠️ All fields are required.';
      return;
    }

    const authToken = localStorage.getItem('authToken');
    this.http.post('http://localhost:5000/users/add', this.newUser, {
      headers: { Authorization: `Bearer ${authToken}` }
    }).subscribe({
      next: () => {
        this.fetchUsers();
        this.newUser = { name: '', role: '', username: '', password: '' };
        this.successMessage = '✅ User added successfully!';
      },
      error: () => {
        this.errorMessage = '❌ Failed to add user.';
      }
    });
  }

  deleteUser(username: string) {
    if (!username) {
      alert('⚠️ Please select a valid user to delete.');
      return;
    }

    const authToken = localStorage.getItem('authToken');
    this.http.delete(`http://localhost:5000/users/delete/${username}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    }).subscribe({
      next: () => {
        this.fetchUsers();
        this.successMessage = '✅ User deleted successfully!';
      },
      error: () => {
        this.errorMessage = '❌ Error deleting user.';
      }
    });
  }
}
