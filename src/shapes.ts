/// <reference path="util.ts" />

const SHAPES: { [key: string]: CoordinatePair[] } = {
    "SINGLE": [
        new CoordinatePair(0,0)
    ],
    "DOUBLE_LINE_V": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1)
    ],
    "DOUBLE_LINE_H": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0)
    ],
    "TRIPLE_LINE_V": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(0,2)
    ],
    "TRIPLE_LINE_H": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(2,0)
    ],
    "QUAD_LINE_V": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(0,2),
        new CoordinatePair(0,3)
    ],
    "QUAD_LINE_H": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(2,0),
        new CoordinatePair(3,0)
    ],
    "SQUARE": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(1,0),
        new CoordinatePair(1,1)
    ],
    "RIGHT_ANGLE_1": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(1,1),
    ],
    "RIGHT_ANGLE_2": [
        new CoordinatePair(0,1),
        new CoordinatePair(1,0),
        new CoordinatePair(1,1)
    ],
    "RIGHT_ANGLE_3": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(1,1)
    ],
    "RIGHT_ANGLE_4": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(1,0)
    ],
    "RIGHT_ANGLE_LONG_1_H": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(1,1),
        new CoordinatePair(2,1),
    ],
    "RIGHT_ANGLE_LONG_1_V": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(0,2),
        new CoordinatePair(1,2),
    ],
    "RIGHT_ANGLE_LONG_2_H": [
        new CoordinatePair(0,1),
        new CoordinatePair(1,1),
        new CoordinatePair(2,1),
        new CoordinatePair(2,0),
    ],
    "RIGHT_ANGLE_LONG_2_V": [
        new CoordinatePair(1,0),
        new CoordinatePair(1,1),
        new CoordinatePair(1,2),
        new CoordinatePair(0,2),
    ],
    "RIGHT_ANGLE_LONG_3_H": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(2,0),
        new CoordinatePair(2,1)
    ],
    "RIGHT_ANGLE_LONG_3_V": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(1,1),
        new CoordinatePair(1,2)
    ],
    "RIGHT_ANGLE_LONG_4_H": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(2,0),
        new CoordinatePair(0,1)
    ],
    "RIGHT_ANGLE_LONG_4_V": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(0,1),
        new CoordinatePair(0,2)
    ],
    "T_SHAPE_UP": [
        new CoordinatePair(0,1),
        new CoordinatePair(1,1),
        new CoordinatePair(2,1),
        new CoordinatePair(1,0)
    ],
    "T_SHAPE_DOWN": [
        new CoordinatePair(0,0),
        new CoordinatePair(1,0),
        new CoordinatePair(2,0),
        new CoordinatePair(1,1)
    ],
    "T_SHAPE_CW": [
        new CoordinatePair(1,0),
        new CoordinatePair(1,1),
        new CoordinatePair(1,2),
        new CoordinatePair(0,1)
    ],
    "T_SHAPE_CCW": [
        new CoordinatePair(0,0),
        new CoordinatePair(0,1),
        new CoordinatePair(0,2),
        new CoordinatePair(1,1)
    ],
}

function randomShape(): CoordinatePair[] {
    const shapeKeys = Object.keys(SHAPES);
    const randomIndex = Math.floor(Math.random() * shapeKeys.length);
    const randomKey = shapeKeys[randomIndex];
    return SHAPES[randomKey];
}