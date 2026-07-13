/**
 * Contrato do publisher de eventos.
 * @typedef {object} QueuePublisher
 * @property {(event: object) => Promise<boolean>} publish
 * @property {() => Promise<void>} [close]
 */

/**
 * Controles de ack expostos ao handler de consumo.
 * @typedef {object} QueueMessageControls
 * @property {() => void} ack
 * @property {(requeue?: boolean) => void} nack
 * @property {(event: object) => Promise<void>} republish
 */

/**
 * Contrato do consumer de eventos.
 * @typedef {object} QueueConsumer
 * @property {(handler: (event: object, controls: QueueMessageControls) => Promise<void>) => Promise<void>} consume
 * @property {() => Promise<void>} [close]
 */

export {};
