import type { ISolveRepository } from "../ports/ISolveRepository";
import type { INotificationService } from "../ports/INotificationService";
import type { Solve } from "@interfaces";

export class AddSolve {
  constructor(private solveRepo: ISolveRepository, private notification?: INotificationService) {}

  async execute(solve: Solve): Promise<Solve> {
    const added = await this.solveRepo.addSolve(solve);

    // Optional: notify outer layers
    this.notification?.addNotification?.({ header: "New solve", text: "Solve recorded", timeout: 2000 });

    return added;
  }
}
