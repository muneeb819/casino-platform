import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, type AuthedUser } from "../../common/auth.guards";
import { GamesService } from "./games.service";

@Controller("games")
export class GamesController {
  constructor(private games: GamesService) {}

  @Get()
  list(@Query("category") category?: string) {
    return this.games.listGames(category);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post(":id/launch")
  launch(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.games.launch(user.id, id);
  }
}
