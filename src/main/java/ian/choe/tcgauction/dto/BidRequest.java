package ian.choe.tcgauction.dto;

import lombok.Data;

@Data
public class BidRequest {
    private String bidder;
    private Integer bidAmount;
}
