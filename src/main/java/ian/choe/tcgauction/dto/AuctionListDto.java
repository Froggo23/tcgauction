package ian.choe.tcgauction.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuctionListDto {
    private Long id;
    private String title;
    private String imagePath;
    private Integer startingPrice;
    private Integer currentPrice;
    private String topBidder;
    private int bidCount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String seller;
}
