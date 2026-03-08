package ian.choe.tcgauction.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BidDto {
    private Long id;
    private String bidder;
    private Integer bidAmount;
    private LocalDateTime createdAt;
}
