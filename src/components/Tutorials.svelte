<script lang="ts">
  import Plus from 'svelte-material-icons/Plus.svelte';
</script>

<main class="container">
  <button class="stroked"><Plus /> Add Tutorial</button>
</main>

<!-- <div class="container">
  <button mat-stroked-button (click)="addTutorial()"> <mat-icon svgIcon="plus"></mat-icon> Add Tutorial </button>
</div>
<mat-card class="container mat-elevation-z" *ngFor="let k of keys">
  <mat-card-title>{{k}}</mat-card-title>
  <mat-card-content>
    <a class="card-mini" mat-flat-button
      *ngFor="let t of tutorials[k]"
      [routerLink]="t.puzzle + '/' + t.titleLower + '?id=' + t._id"
      >{{t.title}}</a>
  </mat-card-content>
</mat-card> -->

<!-- .card-mini {
  margin: 5px;
  background-color: #{$primary};
  color: white;
  padding: 10px;
  box-shadow: 1px 2px 3px rgba(0, 0, 0, 0.34);
  text-shadow: 0px 0px 7px black;
  font-size: 1.1rem;
}

mat-card {
  margin-left: $padding;
  width: calc(100% - #{($padding + 16px) * 2});
  background-color: #{$light};

  mat-card-title {
    color: #{$text-dark};
  }
}

button {
  color: #{$text-dark};
  background: #{$accent};
} -->