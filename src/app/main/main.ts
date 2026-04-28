import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
// import { Formation } from '../model/user.model';
import { FormationService } from '../services/formation';

interface Formation {
  duree: string;
  prix: string;
  id: number;
  title: string;
  description: string;
}

@Component({
  selector: 'app-main',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class MainComponent implements OnInit {
  formations: Formation[] = [];
  filteredFormations: Formation[] = [];
  searchTerm: string = '';

  constructor(private formationService: FormationService, private router: Router) {}

  ngOnInit() {
    this.formations = this.formationService.getFormations();
    this.filteredFormations = this.formations;
  }

  onSearch() {
    if (this.searchTerm.trim() === '') {
      this.filteredFormations = this.formations;
    } else {
      this.filteredFormations = this.formations.filter(formation =>
        formation.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        formation.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  voirFormation(id: number) {
    this.router.navigate(['/formation', id]);
  }
}
