// Icônes en trait fin (Lucide, licence ISC) : on les appelle par un nom court, jamais d'emoji dans l'interface.
import {
  ChevronLeft, ChevronRight, X, Check, UserRound, Settings2, Play, Plus, Minus, Dices, Gamepad2, Trophy, Crown, Star, Sparkles, Coins, Gem, Heart, Flame, Zap,
  Bomb, Shield, Crosshair, Timer, Music2, Image, Users, LogOut, RotateCcw, Shuffle, Undo2, Lock, LockOpen, Eye, ScanLine, ScanFace, Cpu, Wifi, Volume2, VolumeX,
  Smile, Laugh, Frown, Angry, ThumbsUp, Hand, HandHeart, PartyPopper, Droplets, Meh, Annoyed, Medal as MedalIco, Award, Swords, Rocket, Car, Plane, Snowflake, Target, Hourglass,
  Palette, Shirt, Footprints, Glasses, Wand2, IdCard, Fingerprint, BadgeCheck, Gift, ShoppingCart, Store, Skull, Anchor, Ghost, Orbit, Atom, Radar, Grid2x2,
  Trees, Mountain, Waves, Sun, Moon, Puzzle, Joystick, Layers, Shapes, Bot, Megaphone, Flag, MapPin, Compass, Info, CircleHelp, Hammer, History, ListOrdered,
  ChartBar, Activity, Ribbon, PersonStanding, Brain, Calculator, Mic, Disc3, Clapperboard, Type, Library, Gauge, Signal, Footprints as Steps, Feather, Magnet,
  Lamp, Backpack, Shirt as Top, Box, Package, Rabbit, Bird, Fish, Turtle, KeyRound, Banana, CircleDot, Hexagon, Triangle, Square, Circle, Repeat, Pin, Save, Mail,
  Cloud, CloudOff, Download, Upload, Link, Pencil, Trash2, Sword, Ear, Bell, HelpCircle, Workflow, Network, Satellite, Scissors, Megaphone as Horn, Tablet,
  VenetianMask, Dice3, TriangleExclamationPoint, ArrowLeftRight, Handshake, HandCoins, Phone, PawPrint, FlaskConical, Search, OctagonX, Map as MapIcon, Globe,
  Briefcase, Apple, Building, Tag, Volleyball, UtensilsCrossed, Locate, OctagonExclamationPoint,
  Umbrella, ToyBrick, Wind, Castle, Scroll, EyeOff, Sprout, BookOpen, Sparkle, WandSparkles, Theater,
  Lightbulb, Bike, Radio, Copy, ClipboardList, ImageOff, Dog,
} from "lucide-react";

const MAP = {
  back: ChevronLeft, next: ChevronRight, close: X, check: Check, user: UserRound, settings: Settings2, play: Play, plus: Plus, minus: Minus, dice: Dices,
  gamepad: Gamepad2, trophy: Trophy, crown: Crown, star: Star, sparkles: Sparkles, coins: Coins, gem: Gem, heart: Heart, flame: Flame, bolt: Zap, bomb: Bomb,
  shield: Shield, crosshair: Crosshair, timer: Timer, music: Music2, image: Image, users: Users, logout: LogOut, reset: RotateCcw, shuffle: Shuffle, undo: Undo2,
  lock: Lock, unlock: LockOpen, eye: Eye, scan: ScanLine, scanface: ScanFace, cpu: Cpu, wifi: Wifi, sound: Volume2, mute: VolumeX, smile: Smile, laugh: Laugh,
  frown: Frown, angry: Angry, thumbs: ThumbsUp, hand: Hand, handheart: HandHeart, party: PartyPopper, drops: Droplets, meh: Meh, annoyed: Annoyed, medal: MedalIco,
  award: Award, swords: Swords, rocket: Rocket, car: Car, plane: Plane, snow: Snowflake, target: Target, hourglass: Hourglass, palette: Palette, shirt: Shirt,
  feet: Footprints, glasses: Glasses, wand: Wand2, idcard: IdCard, fingerprint: Fingerprint, badge: BadgeCheck, gift: Gift, cart: ShoppingCart, store: Store,
  skull: Skull, anchor: Anchor, ghost: Ghost, orbit: Orbit, atom: Atom, radar: Radar, grid: Grid2x2, trees: Trees, mountain: Mountain, waves: Waves, sun: Sun,
  moon: Moon, puzzle: Puzzle, joystick: Joystick, layers: Layers, shapes: Shapes, bot: Bot, megaphone: Megaphone, flag: Flag, pin: MapPin, compass: Compass,
  info: Info, help: CircleHelp, hammer: Hammer, history: History, list: ListOrdered, chart: ChartBar, activity: Activity, ribbon: Ribbon, person: PersonStanding,
  brain: Brain, calc: Calculator, mic: Mic, disc: Disc3, film: Clapperboard, type: Type, library: Library, gauge: Gauge, signal: Signal, steps: Steps, feather: Feather,
  magnet: Magnet, lamp: Lamp, backpack: Backpack, top: Top, box: Box, package: Package, rabbit: Rabbit, bird: Bird, fish: Fish, turtle: Turtle, key: KeyRound,
  banana: Banana, dot: CircleDot, hexagon: Hexagon, triangle: Triangle, square: Square, circle: Circle, repeat: Repeat, pinned: Pin, save: Save, mail: Mail,
  cloud: Cloud, cloudoff: CloudOff, download: Download, upload: Upload, link: Link, edit: Pencil, trash: Trash2, sword: Sword, ear: Ear, bell: Bell, question: HelpCircle,
  flow: Workflow, network: Network, satellite: Satellite, scissors: Scissors, horn: Horn, tablet: Tablet,
  mask: VenetianMask, dice3: Dice3, alert: TriangleExclamationPoint, swap: ArrowLeftRight, handshake: Handshake, handcoins: HandCoins, phone: Phone, paw: PawPrint,
  flask: FlaskConical, search: Search, stop: OctagonExclamationPoint, cross: OctagonX, map: MapIcon, globe: Globe, briefcase: Briefcase, apple: Apple,
  building: Building, tag: Tag, ball: Volleyball, food: UtensilsCrossed, locate: Locate,
  umbrella: Umbrella, toy: ToyBrick, wind: Wind, castle: Castle, scroll: Scroll, eyeoff: EyeOff, sprout: Sprout, book: BookOpen, sparkle: Sparkle, wandsp: WandSparkles, theater: Theater,
  bulb: Lightbulb, bike: Bike, radio: Radio, copy: Copy, cliplist: ClipboardList, imageoff: ImageOff, dog: Dog,
};

/** Icône par nom (`back`, `trophy`, `gem`…). size en px, stroke = épaisseur du trait (fin par défaut). */
export function Icon({ name, size = 20, stroke = 1.7, className = "", title, style, ...rest }) {
  const C = MAP[name] || CircleDot;
  return <C size={size} strokeWidth={stroke} className={"ico " + className} aria-hidden={title ? undefined : true} aria-label={title} style={style} {...rest} />;
}
export const iconNames = Object.keys(MAP);
/** Composant Lucide d'un nom d'icône (pour dessiner l'icône ailleurs, ex. sur un canvas 3D). */
export const iconOf = (name) => MAP[name] || CircleDot;
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
/** Médaille de rang : or / argent / bronze en dégradé + numéro ; au-delà, « 4e ». */
export const Medal = ({ rank }) => (rank <= 3 ? <span className={"medal m" + rank} aria-label={ord(rank)}><Icon name="medal" size={16} /><i>{rank}</i></span> : <>{ord(rank)}</>);
