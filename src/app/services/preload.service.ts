import { Injectable } from '@angular/core';
import * as constant from "../constants";
import { preloadImagesOnce } from '../functions';

@Injectable({
  providedIn: 'root'
})
export class PreloadService {
  preloadFree() {
    return preloadImagesOnce(constant.imagesPlayAll);
  }

  preloadCompetitive(regions: string[]) {
    const covers = Object.values(constant.regionCovers);
    return preloadImagesOnce([...constant.imagesRegional, ...covers]);
  }

  preloadTournament() {
    return preloadImagesOnce(constant.championsImages);
  }
}
