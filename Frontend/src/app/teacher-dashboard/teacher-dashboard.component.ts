import { Component, ChangeDetectorRef } from '@angular/core'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartType, ChartOptions, ChartData } from 'chart.js';
import { StudentListComponent } from '../student-list/student-list.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css'],
  imports: [CommonModule, FormsModule, NgIf, NgChartsModule, StudentListComponent]
})
export class TeacherDashboardComponent {
  activeSection: string = 'dashboard';
  dynamicHeading: string = '📊 Marks Overview';

  teacherName: string = '';

  students: any[] = [];
  subjects: any[] = [];
  studentMarks: any[] = [];

  selectedStudentUsername: string = '';
  selectedSubjectId: string = '';
  selectedMonth: string = '';

  successMessage: string = '';
  errorMessage: string = '';

  newMark = { username: '', subject_id: '', month: '', year: '', score: '' };

  // ✅ For adding a new subject
  newSubjectName: string = '';

  months = [
    { value: '1', name: 'January' }, { value: '2', name: 'February' }, { value: '3', name: 'March' },
    { value: '4', name: 'April' }, { value: '5', name: 'May' }, { value: '6', name: 'June' },
    { value: '7', name: 'July' }, { value: '8', name: 'August' }, { value: '9', name: 'September' },
    { value: '10', name: 'October' }, { value: '11', name: 'November' }, { value: '12', name: 'December' }
  ];

  pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#66FF66', '#FF66FF'],
      hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#66FF66', '#FF66FF']
    }]
  };

  pieChartOptions: ChartOptions = { responsive: true };
  pieChartType: ChartType = 'pie';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private authService: AuthService) {
    this.teacherName = this.authService.getTeacherName();
    this.fetchStudents();
    this.fetchSubjects();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    };
  }

  fetchTeacherName() {
    this.teacherName = localStorage.getItem('teacherName') || 'Teacher';
  }

  fetchStudents() {
    this.http.get('http://localhost:5000/students', this.getAuthHeaders()).subscribe({
      next: (response: any) => this.students = response,
      error: (error) => console.error('❌ Error fetching students:', error)
    });
  }

  fetchSubjects() {
    this.http.get('http://localhost:5000/subjects').subscribe({
      next: (response: any) => this.subjects = response,
      error: (error) => console.error('❌ Error fetching subjects:', error)
    });
  }

  addMark() {
    if (!this.newMark.username || !this.newMark.subject_id || !this.newMark.month || !this.newMark.year || !this.newMark.score) {
      this.errorMessage = '⚠️ All fields are required to add a mark.';
      return;
    }

    this.http.post('http://localhost:5000/marks/add', this.newMark, this.getAuthHeaders()).subscribe({
      next: () => {
        this.successMessage = '✅ Mark added successfully!';
        this.errorMessage = '';
        this.newMark = { username: '', subject_id: '', month: '', year: '', score: '' };
        this.fetchChartData();
      },
      error: () => {
        this.errorMessage = '❌ Failed to add mark!';
        this.successMessage = '';
      }
    });
  }

  addSubject() {
    if (!this.newSubjectName.trim()) {
      this.errorMessage = '⚠️ Subject name cannot be empty.';
      return;
    }

    this.http.post('http://localhost:5000/subjects', { subject_name: this.newSubjectName })
.subscribe({
      next: () => {
        this.successMessage = '✅ Subject added successfully!';
        this.errorMessage = '';
        this.newSubjectName = '';
        this.fetchSubjects();
      },
      error: () => {
        this.errorMessage = '❌ Failed to add subject!';
        this.successMessage = '';
      }
    });
  }

  fetchChartData() {
    if (!this.selectedMonth) return;
    const currentYear = new Date().getFullYear();

    this.http.get<any[]>(`http://localhost:5000/marks/average/${this.selectedMonth}?year=${currentYear}`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.pieChartData = {
          labels: response.map(data => data.subject_name),
          datasets: [{
            data: response.map(data => data.average_score),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#66FF66', '#FF66FF'],
            hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#66FF66', '#FF66FF']
          }]
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.pieChartData = { labels: [], datasets: [{ data: [] }] };
        this.cdr.detectChanges();
      }
    });
  }

  getMonthName(monthValue: number): string {
    const months = this.months;
    return this.months.find(m => Number(m.value) === monthValue)?.name || "N/A";


  }

  updateMark(markId: number, updatedScore: number) {
    this.http.put(`http://localhost:5000/marks/update/${markId}`, { score: updatedScore }, this.getAuthHeaders()).subscribe({
      next: () => {
        this.successMessage = 'Mark updated successfully!';
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Failed to update mark!';
      }
    });
  }

  deleteMark(markId: number) {
    this.http.delete(`http://localhost:5000/marks/delete/${markId}`, this.getAuthHeaders()).subscribe({
      next: () => {
        this.successMessage = 'Mark deleted successfully!';
        this.fetchStudentMarks();
      },
      error: () => {
        this.errorMessage = 'Failed to delete mark!';
      }
    });
  }

  setActiveSection(section: string) {
    this.activeSection = section;
    this.dynamicHeading = this.getHeadingForSection(section);
  }

  fetchStudentMarks() {
    if (!this.selectedStudentUsername || !this.selectedSubjectId) {
      this.errorMessage = 'Please select a student and a subject to fetch marks.';
      this.studentMarks = [];
      return;
    }

    this.http.get<any[]>(`http://localhost:5000/marks/student/${this.selectedStudentUsername}`, this.getAuthHeaders()).subscribe({
      next: (response: any[]) => {
        this.studentMarks = response.filter(mark => mark.subject_id == this.selectedSubjectId);
      },
      error: () => {
        this.errorMessage = 'Error fetching marks!';
        this.studentMarks = [];
      }
    });
  }

  getSubjectName(subjectId: string): string {
    const found = this.subjects.find(sub => sub.id == subjectId);
    return found ? found.subject_name : '';
  }

  private getHeadingForSection(section: string): string {
    switch (section) {
      case 'dashboard': return '📊 Marks Overview';
      case 'add-marks': return '➕ Add New Marks';
      case 'update-marks': return '📝 Update/Delete Marks';
      case 'student-list': return '📋 Student List';
      case 'add-subject': return '➕ Add New Subject'; // ✅ New section label
      default: return 'Teacher Dashboard';
    }
  }
}
