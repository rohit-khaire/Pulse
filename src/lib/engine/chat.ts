import { Frame } from './types';

export interface ChatMessage {
  id: string;
  sender: string;
  avatarColor: string;
  text: string;
  timestamp: string;
  isUser?: boolean;
  ballNumber?: string;
  likes?: number;
  badge?: string;
}

const FAN_NAMES = [
  'Aman Sharma',
  'Rohit Fan24',
  'Bunty_CricLover',
  'Pooja_Cricket',
  'Rahul_TheWall',
  'DelhiBoy_Sahil',
  'CricketNerd_Dev',
  'Sneha_Kolkata',
  'Vicky_Sixer',
  'Deepak_RR_Fan',
];

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
];

export function generateFanReactionForDelivery(frame: Frame): ChatMessage[] {
  const d = frame.delivery;
  const ballNumber = `${frame.over}.${frame.ballInOver}`;
  const messages: ChatMessage[] = [];

  const randomSender = (idx: number) => FAN_NAMES[idx % FAN_NAMES.length];
  const randomColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

  // Wicket Reaction
  if (d.wickets && d.wickets.length > 0) {
    const w = d.wickets[0];
    messages.push({
      id: `chat-${frame.i}-1`,
      sender: randomSender(frame.i),
      avatarColor: randomColor(frame.i),
      text: `OUTTTTT!! ${w.playerOut} gone! ${d.bowler} is bowling pure fire right now! 🔥🎯`,
      timestamp: 'Just now',
      ballNumber,
      likes: 14,
      badge: 'Live Fan',
    });
    messages.push({
      id: `chat-${frame.i}-2`,
      sender: randomSender(frame.i + 1),
      avatarColor: randomColor(frame.i + 1),
      text: `Bro what a turn in this match! Who expected ${d.bowler} to strike here?! Unbelievable! 😱`,
      timestamp: 'Just now',
      ballNumber,
      likes: 9,
    });
  } else if (d.isSix) {
    messages.push({
      id: `chat-${frame.i}-1`,
      sender: randomSender(frame.i),
      avatarColor: randomColor(frame.i),
      text: `BOOOOM! Massive SIX by ${d.batter}! That went straight onto the roof! 🚀💥`,
      timestamp: 'Just now',
      ballNumber,
      likes: 18,
      badge: 'Top Fan',
    });
  } else if (d.isFour) {
    messages.push({
      id: `chat-${frame.i}-1`,
      sender: randomSender(frame.i),
      avatarColor: randomColor(frame.i),
      text: `Cracking FOUR! Sweet timing from ${d.batter}. Gorgeous boundary! 🏏✨`,
      timestamp: 'Just now',
      ballNumber,
      likes: 6,
    });
  } else if (d.isDot) {
    if (frame.innings === 2 && frame.over >= 18) {
      messages.push({
        id: `chat-${frame.i}-1`,
        sender: randomSender(frame.i),
        avatarColor: randomColor(frame.i),
        text: `GOLD DUST DOT BALL! Pressure building up on ${d.batter}! My heart can't take this tension! 🥶`,
        timestamp: 'Just now',
        ballNumber,
        likes: 12,
      });
    }
  }

  return messages;
}

