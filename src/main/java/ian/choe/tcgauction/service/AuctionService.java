package ian.choe.tcgauction.service;

import ian.choe.tcgauction.dto.*;
import ian.choe.tcgauction.entity.Auction;
import ian.choe.tcgauction.entity.Bid;
import ian.choe.tcgauction.repository.AuctionRepository;
import ian.choe.tcgauction.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.upload-dir}")
    private String uploadDir;

    public List<AuctionListDto> getAllAuctions() {
        return auctionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(a -> {
                    var topBid = bidRepository.findFirstByAuctionIdOrderByBidAmountDesc(a.getId());
                    int bidCount = bidRepository.countByAuctionId(a.getId());
                    return AuctionListDto.builder()
                            .id(a.getId())
                            .title(a.getTitle())
                            .imagePath(a.getImagePath())
                            .startingPrice(a.getStartingPrice())
                            .currentPrice(topBid.map(Bid::getBidAmount).orElse(a.getStartingPrice()))
                            .topBidder(topBid.map(Bid::getBidder).orElse(null))
                            .bidCount(bidCount)
                            .startDate(a.getStartDate())
                            .endDate(a.getEndDate())
                            .seller(a.getSeller())
                            .build();
                })
                .collect(Collectors.toList());
    }

    public Optional<AuctionDetailDto> getAuctionDetail(Long id) {
        return auctionRepository.findById(id).map(a -> {
            List<BidDto> bidDtos = bidRepository.findByAuctionIdOrderByBidAmountDesc(a.getId()).stream()
                    .map(b -> BidDto.builder()
                            .id(b.getId())
                            .bidder(b.getBidder())
                            .bidAmount(b.getBidAmount())
                            .createdAt(b.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());

            return AuctionDetailDto.builder()
                    .id(a.getId())
                    .title(a.getTitle())
                    .description(a.getDescription())
                    .imagePath(a.getImagePath())
                    .startingPrice(a.getStartingPrice())
                    .bidUnit(a.getBidUnit())
                    .startDate(a.getStartDate())
                    .endDate(a.getEndDate())
                    .seller(a.getSeller())
                    .createdAt(a.getCreatedAt())
                    .bids(bidDtos)
                    .build();
        });
    }

    @Transactional
    public Long createAuction(String title, String description, Integer startingPrice,
            Integer bidUnit, String startDate, String endDate,
            String seller, MultipartFile image) throws IOException {
        String imagePath = saveImage(image);

        Auction auction = new Auction();
        auction.setTitle(title);
        auction.setDescription(description);
        auction.setImagePath(imagePath);
        auction.setStartingPrice(startingPrice);
        auction.setBidUnit(bidUnit);
        auction.setStartDate(LocalDateTime.parse(startDate));
        auction.setEndDate(LocalDateTime.parse(endDate));
        auction.setSeller(seller);

        auctionRepository.save(auction);
        return auction.getId();
    }

    @Transactional
    public BidDto placeBid(Long auctionId, String bidder, Integer bidAmount) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("경매를 찾을 수 없습니다."));

        if (bidder.equals(auction.getSeller())) {
            throw new IllegalStateException("본인 경매에는 입찰할 수 없습니다.");
        }

        var topBid = bidRepository.findFirstByAuctionIdOrderByBidAmountDesc(auctionId);
        int currentPrice = topBid.map(Bid::getBidAmount).orElse(auction.getStartingPrice());
        int minimumBid = currentPrice + auction.getBidUnit();

        if (bidAmount < minimumBid) {
            throw new IllegalArgumentException(
                    "최소 입찰가는 " + String.format("%,d", minimumBid) + "원 입니다.");
        }

        Bid bid = new Bid();
        bid.setAuction(auction);
        bid.setBidder(bidder);
        bid.setBidAmount(bidAmount);
        bidRepository.save(bid);

        BidDto bidDto = BidDto.builder()
                .id(bid.getId())
                .bidder(bid.getBidder())
                .bidAmount(bid.getBidAmount())
                .createdAt(bid.getCreatedAt())
                .build();

        // [WEBSOCKET] 입찰 발생 시 해당 경매를 구독 중인 클라이언트에게 전체 상세 정보 브로드캐스트
        getAuctionDetail(auctionId)
                .ifPresent(detail -> messagingTemplate.convertAndSend("/topic/auction/" + auctionId, detail));

        return bidDto;
    }

    private String saveImage(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty())
            return null;

        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        String ext = getExtension(image.getOriginalFilename());
        String fileName = UUID.randomUUID() + "." + ext;
        Path filePath = uploadPath.resolve(fileName);
        image.transferTo(filePath.toFile());

        return "/uploads/" + fileName;
    }

    private String getExtension(String filename) {
        if (filename == null)
            return "jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "jpg";
    }
}
