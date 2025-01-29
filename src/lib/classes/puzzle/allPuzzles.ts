import { RUBIK } from "./nnn";
import { SKEWB } from "./skewb";
import { SQUARE1 } from "./square1";
import { PYRAMINX } from "./pyraminx";
import { AXIS } from "./axis";
import { WINDMILL } from "./windmill";
import { FISHER } from "./fisher";
import { IVY } from "./ivy";
import { CLOCK } from "./clock";
import { MEGAMINX } from "./megaminx";
import { MIRROR } from "./mirror";
import { DINO } from "./dino";
import { REX } from "./rex";
import { REDI } from "./redi";
import { MIXUP } from "./mixup";
import { PYRAMORPHIX } from "./pyramorphix";
import { GEAR } from "./gear";
import { DREIDEL } from "./dreidel";
import { BDG } from "./bandaged222";
import { BICUBE } from "./bicube";
import { SQUARE2 } from "./square2";
import { registerPuzzle } from "./puzzleRegister";
import { PANDORA } from "./pandora";
import { ULTIMATE_SKEWB } from "./ultimateSkewb";
import { PYRAMINX_CRYSTAL } from "./pyraminxCrystal";
import { TETRAMINX } from "./tetraminx";
import { MEIER_HALPERN_PYRAMIND } from "./meierHalpernPyramind";
import { SQUARE1_STAR } from "./square1Star";
import { GAN333 } from "./gan333";
import { HELICOPTER } from "./helicopter";
import { SUPER_SQUARE1 } from "./superSquare1";
import { FTO } from "./fto";
import { TIME_MACHINE } from "./timeMachine";
import { MASTER_SKEWB } from "./masterSkewb";
import { VOID } from "./void333";
import { FISHER44 } from "./fisher44";
import { GHOST } from "./ghost";
import { REDI_BARREL } from "./rediBarrel";
import { BARREL33 } from "./barrel33";

// NxN, Pyraminx, Megaminx, Skewb, Square-1, Clock
registerPuzzle("rubik", "Rubik", RUBIK, true);
registerPuzzle("pyraminx", "Pyraminx", PYRAMINX, true);
registerPuzzle("megaminx", "Megaminx", MEGAMINX, true);
registerPuzzle("skewb", "Skewb", SKEWB, false);
registerPuzzle("square1", "Square One", SQUARE1, false);
registerPuzzle("clock", "Rubik's clock", CLOCK, false);

// NxN Mods
registerPuzzle("icarry", "GAN iCarry", GAN333, false);
registerPuzzle("mirror", "Mirror", MIRROR, true);
registerPuzzle("void", "Void Cube", VOID, false);
registerPuzzle("windmill", "Windmill", WINDMILL, false);
registerPuzzle("fisher", "Fisher", FISHER, false);
registerPuzzle("fisher44", "Fisher 4x4", FISHER44, false);
registerPuzzle("axis", "Axis", AXIS, false);
registerPuzzle("pandora", "Pandora", PANDORA, false);
registerPuzzle("mixup", "Mixup", MIXUP, false);
registerPuzzle("barrel33", "Barrel 3x3", BARREL33, false);
registerPuzzle("gear", "Gear", GEAR, false);
registerPuzzle("dreidel", "Dreidel", DREIDEL, false);
registerPuzzle("ghost", "Ghost", GHOST, false);
registerPuzzle("timemachine", "Time Machine", TIME_MACHINE, false);
registerPuzzle("bandaged222", "Bandaged 2x2x2", BDG, false);
registerPuzzle("bicube", "Bicube", BICUBE, false);

// Pyraminx Mods
registerPuzzle("pyramorphix", "Pyramorphix", PYRAMORPHIX, false);
registerPuzzle("tetraminx", "Tetraminx", TETRAMINX, false);
registerPuzzle("meierHalpernPyramid", "Meier-Halpern Pyramid", MEIER_HALPERN_PYRAMIND, false);

// Megaminx Mods
registerPuzzle("pyraminxCrystal", "Pyraminx Crystal", PYRAMINX_CRYSTAL, false);

// Skewb Mods
registerPuzzle("ultimateSkewb", "Ultimate Skewb", ULTIMATE_SKEWB, false);
registerPuzzle("masterskewb", "Master Skewb", MASTER_SKEWB, false);

// Square-1 Mods
registerPuzzle("square2", "Square Two", SQUARE2, false);
registerPuzzle("supersquare1", "Super Square-1", SUPER_SQUARE1, false);
registerPuzzle("sq1Star", "Square-1 Star", SQUARE1_STAR, false);

// Clock Mods
// Others
registerPuzzle("ivy", "Ivy", IVY, false);
registerPuzzle("dino", "Dino", DINO, false);
registerPuzzle("rex", "Rex", REX, false);
registerPuzzle("redi", "Redi", REDI, false);
registerPuzzle("redibarrel", "Redi Barrel", REDI_BARREL, false);
registerPuzzle("helicopter", "Helicopter", HELICOPTER, false);
registerPuzzle("fto", "FTO", FTO, false);
