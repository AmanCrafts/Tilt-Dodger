import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const CAR_WIDTH = 48;
const CAR_HEIGHT = 65;
const PLAYER_WIDTH = CAR_WIDTH;
const PLAYER_HEIGHT = CAR_HEIGHT;
const OBSTACLE_SIZE = CAR_WIDTH;

const PLAYER_Y = height - 150;
const LANE_COUNT = 6;
const LANE_WIDTH = width / LANE_COUNT;

const Car = ({ color = '#e74c3c' }) => (
  <View style={styles.carContainer}>
    <View style={styles.wheelLeftTop} />
    <View style={styles.wheelRightTop} />
    <View style={styles.wheelLeftBottom} />
    <View style={styles.wheelRightBottom} />
    <View style={[styles.carBody, { backgroundColor: color }]} />
    <View style={[styles.carRoof, { backgroundColor: darkenColor(color) }]} />
    <View style={styles.headlightLeft} />
    <View style={styles.headlightRight} />
    <View style={[styles.spoiler, { backgroundColor: darkenColor(color) }]} />
  </View>
);

const darkenColor = (color) => {
  const map = {
    '#e74c3c': '#c0392b',
    '#3498db': '#2980b9',
    '#f1c40f': '#f39c12',
    '#2ecc71': '#27ae60',
    '#9b59b6': '#8e44ad',
  };
  return map[color] || '#333';
};

const OBSTACLE_COLORS = ['#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];

export default function App() {
  const [playerX, setPlayerX] = useState(width / 2 - CAR_WIDTH / 2);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const playerXRef = useRef(width / 2 - CAR_WIDTH / 2);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const gameLoopRef = useRef(null);
  const lastSpawnTime = useRef(0);

  const subscribe = () => {
    setSubscription(
      Accelerometer.addListener(accelerometerData => {
        const { x } = accelerometerData;
        const sensitivity = 25;
        let newX = playerXRef.current - (x * sensitivity); 
        
        if (newX < 0) newX = 0;
        if (newX > width - CAR_WIDTH) newX = width - CAR_WIDTH;
        
        playerXRef.current = newX;
        setPlayerX(newX); 
      })
    );
    Accelerometer.setUpdateInterval(16); 
  };

  const unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  useEffect(() => {
    if (!gameOver) {
      subscribe();
      startGameLoop();
    } else {
      unsubscribe();
      stopGameLoop();
    }
    return () => {
      unsubscribe();
      stopGameLoop();
    };
  }, [gameOver]);

  const startGameLoop = () => {
    const loop = (time) => {
      updateGame(time);
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const stopGameLoop = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  };

  const updateGame = (time) => {
    if (time - lastSpawnTime.current > 1000) {
      const laneIndex = Math.floor(Math.random() * LANE_COUNT);
      const laneCenterX = (laneIndex * LANE_WIDTH) + (LANE_WIDTH / 2);
      const obstacleX = laneCenterX - (CAR_WIDTH / 2);

      const newObstacle = {
        id: Date.now() + Math.random(),
        x: obstacleX,
        y: -CAR_HEIGHT,
        color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)],
      };
      obstaclesRef.current.push(newObstacle);
      lastSpawnTime.current = time;
    }

    const speed = 5 + Math.floor(scoreRef.current / 5); 
    obstaclesRef.current.forEach(obs => {
      obs.y += speed;
    });

    const initialCount = obstaclesRef.current.length;
    obstaclesRef.current = obstaclesRef.current.filter(obs => obs.y < height);
    const removedCount = initialCount - obstaclesRef.current.length;
    if (removedCount > 0) {
      scoreRef.current += removedCount;
      setScore(scoreRef.current);
    }

    const pX = playerXRef.current;
    const pY = PLAYER_Y;
    
    for (let obs of obstaclesRef.current) {
      const hitBoxShrink = 4;
      if (
        pX + hitBoxShrink < obs.x + CAR_WIDTH - hitBoxShrink &&
        pX + CAR_WIDTH - hitBoxShrink > obs.x + hitBoxShrink &&
        pY + hitBoxShrink < obs.y + CAR_HEIGHT - hitBoxShrink &&
        pY + CAR_HEIGHT - hitBoxShrink > obs.y + hitBoxShrink
      ) {
        setGameOver(true);
        return;
      }
    }

    setObstacles([...obstaclesRef.current]);
  };

  const resetGame = () => {
    playerXRef.current = width / 2 - CAR_WIDTH / 2;
    obstaclesRef.current = [];
    scoreRef.current = 0;
    lastSpawnTime.current = 0;
    setPlayerX(playerXRef.current);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.roadContainer}>
        {Array.from({ length: LANE_COUNT - 1 }).map((_, index) => (
          <View key={index} style={styles.laneDivider} />
        ))}
      </View>

      <Text style={styles.score}>Score: {score}</Text>
      
      <View style={[styles.carWrapper, { left: playerX, top: PLAYER_Y }]}>
        <Car color="#e74c3c" />
      </View>

      {obstacles.map(obs => (
        <View key={obs.id} style={[styles.carWrapper, { left: obs.x, top: obs.y }]}>
           <Car color={obs.color} />
        </View>
      ))}

      {gameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Game Over</Text>
          <Text style={styles.finalScoreText}>Final Score: {score}</Text>
          <TouchableOpacity onPress={resetGame} style={styles.button}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
    overflow: 'hidden',
  },
  roadContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  laneDivider: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
  },
  score: {
    position: 'absolute',
    top: 60,
    left: 20,
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    zIndex: 1,
  },
  carWrapper: {
    position: 'absolute',
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
  },
  carContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  carBody: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 40,
    height: 57,
    borderRadius: 6,
    zIndex: 2,
  },
  carRoof: {
    position: 'absolute',
    top: 20,
    left: 8,
    width: 30,
    height: 24,
    borderRadius: 3,
    zIndex: 3,
  },
  wheelLeftTop: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 6,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
    zIndex: 1,
  },
  wheelRightTop: {
    position: 'absolute',
    top: 8,
    right: 0,
    width: 6,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
    zIndex: 1,
  },
  wheelLeftBottom: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    width: 6,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
    zIndex: 1,
  },
  wheelRightBottom: {
    position: 'absolute',
    bottom: 8,
    right: 0,
    width: 6,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
    zIndex: 1,
  },
  headlightLeft: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 6,
    height: 4,
    backgroundColor: '#f1c40f', 
    zIndex: 3,
    borderTopLeftRadius: 3,
  },
  headlightRight: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 6,
    height: 4,
    backgroundColor: '#f1c40f',
    zIndex: 3,
    borderTopRightRadius: 3,
  },
  spoiler: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 32,
    height: 4,
    zIndex: 3,
  },
  
  gameOverContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gameOverText: {
    color: '#ff4444',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalScoreText: {
    color: 'white',
    fontSize: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  buttonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
