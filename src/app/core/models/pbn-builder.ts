import {GeneratedHandPair} from '../../hand-generation/models/hand-generation-api.models';
import {CardCode} from './cards';
import {Player} from './players';

export interface PbnDeal {
  dealer: Player;
  vulnerability: string;
  westHand: CardCode[];
  eastHand: CardCode[];
  northHand?: CardCode[];
  southHand?: CardCode[];
}


function handPairToPBn(handPair: GeneratedHandPair): string {
  const dealer = '[Dealer ' + handPair.dealer;
  const vulnerability = handPair.vulnerability;
  return '';
}

function handsToDeal(westHand: CardCode[], eastHand: CardCode[]): string {

  return '';
}


