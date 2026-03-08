package ian.choe.tcgauction.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AuctionDetailDto {
    private Long id;
    private String title;
    private String description;
    private String imagePath;
    private Integer startingPrice;
    private Integer bidUnit;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String seller;
    private LocalDateTime createdAt;
    private List<BidDto> bids;
}
