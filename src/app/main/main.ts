import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// import { Formation } from '../model/user.model';
import { FormationService } from '../services/formation';

interface Formation {
  id: number;
  title: string;
}

@Component({
  selector: 'app-main',
  imports: [CommonModule],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class MainComponent implements OnInit {
  formations: Formation[] = [];

  constructor(private formationService: FormationService, private router: Router) {}

  ngOnInit() {
    this.formations = this.formationService.getFormations();
  }

  voirFormation(id: number) {
    this.router.navigate(['/formation', id]);
  }
}
