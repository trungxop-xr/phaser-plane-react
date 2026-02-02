import Phaser from 'phaser';

// Used to communicate between React and Phaser
export const EventBus = new Phaser.Events.EventEmitter();
