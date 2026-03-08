package ian.choe.tcgauction.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "auctions")
@Getter
@Setter
@NoArgsConstructor
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    private String imagePath;

    @Column(nullable = false)
    private Integer startingPrice;

    @Column(nullable = false)
    private Integer bidUnit;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Column(nullable = false)
    private String seller;

    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "auction", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("bidAmount DESC")
    private List<Bid> bids = new ArrayList<>();
}
