import { Tank } from './Tank';

export class T95Tank extends Tank {
    constructor(scene, x, y, texture, hp, speed, terrainFn) {
        // T95 uses specific red textures and 't95' config key
        super(scene, x, y, texture, hp, speed, terrainFn, 't95', 't95TankBodyTexture', 't95TankTurretTexture');
    }
}
