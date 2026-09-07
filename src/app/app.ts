import { Component, ChangeDetectorRef, HostListener, ViewChild, ElementRef, NgZone } from '@angular/core';
import { NgClass } from '@angular/common';
import { NgStyle } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

enum Color {
  None = "",
  Gray = "bg-zinc-700",
  Yellow = "bg-amber-400",
  Green = "bg-green-700",
  Blue = "bg-blue-600"
}

interface Cell {
  color: Color;
  hasWall: boolean;
  isWater: boolean;
  isScoring: boolean;
  hasDonkey: boolean;
}

@Component({
  selector: 'app-root',
  imports: [NgClass, NgStyle],
  templateUrl: './app.html',
})

export class App {
  
  puzzle = "";
  maxWalls = 0;
  puzzleGrid: Cell[][] = [];
  donkeyX = 0;
  donkeyY = 0;

  score = 0;
  bestScore = 0;
  bestLayout: Cell[][] = [];
  bestWalls = 0;
  currentWalls = 0;

  submitted = false;
  answer = "";
  answerGrid: Cell[][] = [];
  answerScore = 0;
  showingAnswer = false;
  playerAnswerGrid: Cell[][] = [];

  @ViewChild('resultsModal') resultsModal!: ElementRef<HTMLDialogElement>;

  async ngOnInit(): Promise<void> {
    try {
      await this.getPuzzle();
      this.maxWalls = Number(this.puzzle.split('W')[1]);
      let puzzleList = this.puzzle.split('W')[0].split('|');
      for (let i = 0; i < puzzleList.length; i++) {
        let row = [];
        for (let j = 0; j < puzzleList[i].length; j++) {
          if (puzzleList[i][j] === "g") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false};
          } else if (puzzleList[i][j] === "b") {
            row[j] = {color: Color.Blue, hasWall: false, isWater: true, isScoring: false, hasDonkey: false};
          } else if (puzzleList[i][j] === "d") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: true};
            this.donkeyX = j;
            this.donkeyY = i;
          } else {
            row[j] = {color: Color.None, hasWall: false, isWater: false, isScoring: false, hasDonkey: false};
          }
        }
        this.puzzleGrid[i] = row;
      }
      this.cdr.detectChanges();

      await this.getAnswer();
      let answerList = this.answer.split('|');
      for (let i = 0; i < answerList.length; i++) {
        let row = [];
        for (let j = 0; j < answerList[i].length; j++) {
          if (answerList[i][j] === "g") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false};
          } else if (answerList[i][j] === "b") {
            row[j] = {color: Color.Blue, hasWall: false, isWater: true, isScoring: false, hasDonkey: false};
          } else if (answerList[i][j] === "d") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: true};
          } else if (answerList[i][j] === "w") {
            row[j] = {color: Color.Gray, hasWall: true, isWater: false, isScoring: false, hasDonkey: false};
          } else {
            row[j] = {color: Color.None, hasWall: false, isWater: false, isScoring: false, hasDonkey: false};
          }
        }
        this.answerGrid[i] = row;
      }
      this.checkEnclosed(this.answerGrid, this.donkeyX, this.donkeyY);
      this.answerScore = this.getScore(this.answerGrid);
    } catch (error) {
      console.error('Initialization failed', error);
    }
  }

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  async getPuzzle() {
    const response: any = await firstValueFrom(this.http.get('http://api.losborn.net/api/getPuzzle'));
    this.puzzle = response.puzzle;
  }

  async getAnswer() {
    const response: any = await firstValueFrom(this.http.get('http://api.losborn.net/api/getAnswer'));
    this.answer = response.answer;
  }

  cellClicked(cell: Cell) {
    if (!cell.isWater && !cell.hasDonkey && !this.submitted) {
      if ((cell.color === Color.Green || cell.color === Color.Yellow) && this.currentWalls < this.maxWalls) {
        cell.color = Color.Gray;
        this.currentWalls += 1;
        cell.hasWall = !cell.hasWall;
      } else if (cell.color === Color.Gray) {
        cell.color = Color.Green;
        this.currentWalls -= 1;
        cell.hasWall = !cell.hasWall;
      }
      this.clearIsScoring();
      if (this.checkEnclosed(this.puzzleGrid, this.donkeyX, this.donkeyY)) {
        this.score = this.getScore(this.puzzleGrid);
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          this.bestLayout = structuredClone(this.puzzleGrid);
          this.bestWalls = this.currentWalls;
        }
      } else {
        this.clearIsScoring();
      }
    }
  }

  checkEnclosed(grid: Cell[][], x : number, y: number) : boolean {
    if (y > -1 && y < grid.length) {
      if (x > -1 && x < grid[y].length) {
        let cell = grid[y][x];
        if (cell.hasWall || cell.isWater || cell.isScoring) {
          return true;
        } else {
          cell.isScoring = true;
          return this.checkEnclosed(grid, x - 1, y) && this.checkEnclosed(grid, x + 1, y) && this.checkEnclosed(grid, x, y - 1) && this.checkEnclosed(grid, x, y + 1);
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  getScore(grid: Cell[][]) : number {
    let scoreCounter = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j].isScoring) {
          grid[i][j].color = Color.Yellow;
          scoreCounter += 1;
        }
      }
    }
    return scoreCounter;
  }

  clearIsScoring() {
    for (let i = 0; i < this.puzzleGrid.length; i++) {
      for (let j = 0; j < this.puzzleGrid[i].length; j++) {
        this.puzzleGrid[i][j].isScoring = false;
        if (this.puzzleGrid[i][j].color === Color.Yellow) {
          this.puzzleGrid[i][j].color = Color.Green;
        }
      }
    }
    this.score = 0;
  }

  setBestLayout() {
    this.puzzleGrid = structuredClone(this.bestLayout);
    this.currentWalls = this.bestWalls;
    this.score = this.bestScore;
  }

  submit() {
    this.submitted = true;
    this.playerAnswerGrid = structuredClone(this.puzzleGrid);
  }

  toggleAnswer(){
    if (this.showingAnswer) {
      this.puzzleGrid = this.playerAnswerGrid;
    } else {
      this.puzzleGrid = this.answerGrid;
    }
    this.showingAnswer = !this.showingAnswer;
  }
}
