import type { Game } from "@interfaces";
import { Realtime } from "ably";
import axios from "axios";

const SERVER = `http://localhost:3000/v1/battles`;

export function getSocket() {
  return new Realtime({ authUrl: SERVER + "/auth", autoConnect: true });
}

export async function createBattle(username: string, mode: string, token: string) {
  return axios
    .get(SERVER + `/create/${username}/${mode}`, {
      headers: { Authorization: "Bearer " + token },
    })
    .then(res => ({
      room: res.data.room as string,
      game: res.data.game as Game,
    }));
}

export async function lookBattle(gameID: string, username: string, token: string) {
  return axios
    .get(SERVER + `/observer/${gameID}/${username}`, {
      headers: { Authorization: "Bearer " + token },
    })
    .then(res => ({ game: res.data.game as Game }));
}

export async function joinBattle(gameID: string, username: string, token: string) {
  return axios
    .get(SERVER + `/join/${gameID}/${username}`, {
      headers: { Authorization: "Bearer " + token },
    })
    .then(res => ({ game: res.data.game as Game }));
}

export async function timeBattle(time: number, gameID: string, round: number, token: string) {
  return axios
    .get(SERVER + `/time/${gameID}/${round}/${time === Infinity ? "DNF" : time}`, {
      headers: { Authorization: "Bearer " + token },
    })
    .then(res => ({
      game: res.data.game as Game,
      stage: res.data.stage as string,
    }));
}

export async function startBattle(token: string) {
  return axios
    .get(SERVER + `/start`, {
      headers: { Authorization: "Bearer " + token },
    })
    .then(res => ({
      game: res.data.game as Game,
    }));
}

export async function nextRoundBattle(gameID: string, token: string) {
  return axios
    .get(SERVER + `/next/${gameID}`, {
      headers: { Authorization: "Bearer " + token },
    })
    .then(res => ({
      game: res.data.game as Game,
    }));
}

export async function disconnectBattle(gameID: string, token: string) {
  return axios.get(SERVER + `/exit/${gameID}`, {
    headers: { Authorization: "Bearer " + token },
  });
}
