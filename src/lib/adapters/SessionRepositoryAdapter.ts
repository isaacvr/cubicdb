import { dataService } from "$lib/data-services/data.service";
import { get } from "svelte/store";
import type { ISessionRepository } from "../core/ports/ISessionRepository";
import { AverageSetting, type Session, type SessionSettings } from "@interfaces";

export const SessionDefaultSettings: SessionSettings = {
  hasInspection: true,
  showElapsedTime: true,
  inspection: 15,
  calcAoX: AverageSetting.SEQUENTIAL,
  genImage: true,
  scrambleAfterCancel: false,
  input: "Keyboard",
  withoutPrevention: true,
  recordCelebration: true,
  showBackFace: false,
  sessionType: "mixed",
};

export class SessionRepositoryAdapter implements ISessionRepository {
  async getSessions(): Promise<Session[]> {
    const ds = get(dataService) as any;
    return ds.session.getSessions();
  }

  async addSession(session: Session): Promise<Session> {
    const ds = get(dataService) as any;
    return ds.session.addSession(session);
  }

  async updateSession(session: Session): Promise<Session> {
    const ds = get(dataService) as any;
    return ds.session.updateSession(session);
  }

  async removeSession(session: Session): Promise<Session> {
    const ds = get(dataService) as any;
    return ds.session.removeSession(session);
  }

  createEmptySession(s?: Partial<Session>): Session {
    return {
      _id: "",
      name: "",
      settings: { ...SessionDefaultSettings },
      ...(s || {}),
    };
  }
}
