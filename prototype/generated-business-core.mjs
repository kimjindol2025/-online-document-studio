// Generated from core/business-rules.fl; do not edit.
// Source SHA-256: 1a0353ffe70138a66700d526a446d7609bf6a0929896f204e2ff0b50847e1f88
export function lineSupply(quantity,unitPrice){return (quantity*unitPrice);}
export function lineTax(supply,rate){return Math.floor(((supply*rate)/100));}
export function addAmount(left,right){return (left+right);}
export function depositWithinAmount(amount,deposit){return (deposit<=amount);}
export function orderedPeriod(start,end){return (start<=end);}
