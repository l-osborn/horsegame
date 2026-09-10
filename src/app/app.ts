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

enum Glyph {
  None = "",
  Donkey = "🫏",
  Cherry = "🍒",
  Bee = "🐝",
  PortalRed = '🔴',
  PortalOrange = '🟠',
  PortalYellow = '🟡',
  PortalGreen = '🟢',
  PortalBlue = '🔵',
  PortalPurple = '🟣',
  PortalBlack = '⚫️',
  PortalWhite = '⚪️',
  PortalBrown = '🟤',
}

interface Cell {
  color: Color;
  hasWall: boolean;
  isWater: boolean;
  isScoring: boolean;
  hasDonkey: boolean;
  glyph: Glyph;
  scoreModifier: number;
  portalType: number;
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
  clearGrid: Cell[][] = [];

  portalGlyphs: Glyph[] = [Glyph.PortalRed, Glyph.PortalOrange, Glyph.PortalYellow, Glyph.PortalGreen, Glyph.PortalBlue, Glyph.PortalPurple, Glyph.PortalBlack, Glyph.PortalWhite, Glyph.PortalBrown];

  @ViewChild('resultsModal') resultsModal!: ElementRef<HTMLDialogElement>;

  async ngOnInit(): Promise<void> {
    try {
      await this.getPuzzle();
      this.maxWalls = Number(this.puzzle.split('W')[1]);
      let puzzleList = this.puzzle.split('W')[0].split('|');
      for (let i = 0; i < puzzleList.length; i++) {
        let row = [];
        for (let j = 0; j < puzzleList[i].length; j++) {
          let currentCell = puzzleList[i][j];
          if (currentCell === "g") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
          } else if (currentCell === "b") {
            row[j] = {color: Color.Blue, hasWall: false, isWater: true, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
          } else if (currentCell === "d") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: true, glyph: Glyph.Donkey, scoreModifier: 0, portalType: 0};
            this.donkeyX = j;
            this.donkeyY = i;
          } else if (currentCell === "c") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.Cherry, scoreModifier: 3, portalType: 0};
          } else if (currentCell === "B") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.Bee, scoreModifier: -5, portalType: 0};
          } else if (this.isPortal(currentCell) ) {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: this.portalGlyphs[Number(currentCell) - 1], scoreModifier: 0, portalType: Number(currentCell)};
          } else {
            row[j] = {color: Color.None, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
          }
        }
        this.puzzleGrid[i] = row;
      }
      this.clearGrid = structuredClone(this.puzzleGrid);
      this.cdr.detectChanges();

      await this.getAnswer();
      let answerList = this.answer.split('|');
      for (let i = 0; i < answerList.length; i++) {
        let row = [];
        for (let j = 0; j < answerList[i].length; j++) {
          let currentCell = answerList[i][j];
          if (currentCell === "g") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
          } else if (currentCell === "b") {
            row[j] = {color: Color.Blue, hasWall: false, isWater: true, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
          } else if (currentCell === "d") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: true, glyph: Glyph.Donkey, scoreModifier: 0, portalType: 0};
          } else if (currentCell === "w") {
            row[j] = {color: Color.Gray, hasWall: true, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
          } else if (currentCell === "c") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.Cherry, scoreModifier: 3, portalType: 0};
          } else if (currentCell === "B") {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.Bee, scoreModifier: -5, portalType: 0};
          } else if (this.isPortal(currentCell) ) {
            row[j] = {color: Color.Green, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: this.portalGlyphs[Number(currentCell) - 1], scoreModifier: 0, portalType: Number(currentCell)};
          } else {
            row[j] = {color: Color.None, hasWall: false, isWater: false, isScoring: false, hasDonkey: false, glyph: Glyph.None, scoreModifier: 0, portalType: 0};
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

  isPortal(str: string): boolean {
    return !isNaN(Number(str)) && str.trim() !== "" && str !== '0';
  }

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  async getPuzzle() {
    const response: any = await firstValueFrom(this.http.get('https://api.losborn.net/api/getPuzzle'));
    this.puzzle = response.puzzle;
  }

  async getAnswer() {
    const response: any = await firstValueFrom(this.http.get('https://api.losborn.net/api/getAnswer'));
    this.answer = response.answer;
  }

  cellClicked(cell: Cell) {
    if (!cell.isWater && !cell.hasDonkey && !this.submitted && cell.glyph === Glyph.None) {
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
          let portalEnclosed = true;
          if (cell.portalType !== 0) {
            for (let y2 = 0; y2 < grid.length; y2++) {
              for (let x2 = 0; x2 < grid[y2].length; x2++) {
                let cell2 = grid[y2][x2];
                if (cell2.portalType === cell.portalType && !(x2 == x && y2 == y) ) {
                  portalEnclosed = this.checkEnclosed(grid, x2, y2);
                }
              }
            }
          }
          return this.checkEnclosed(grid, x - 1, y) && this.checkEnclosed(grid, x + 1, y) && this.checkEnclosed(grid, x, y - 1) && this.checkEnclosed(grid, x, y + 1) && portalEnclosed;
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
          scoreCounter += 1 + grid[i][j].scoreModifier;
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

  clear() {
    this.puzzleGrid = structuredClone(this.clearGrid);
    this.currentWalls = 0;
    this.score = 0;
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
